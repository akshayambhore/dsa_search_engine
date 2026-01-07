import express from "express";
import fs from "fs/promises";
import pkg from "natural";
import preprocess from "./utils/preprocess.js";

const { TfIdf } = pkg;
const app = express();
const PORT = process.env.PORT || 3000;

/* =======================
   MIDDLEWARE
======================= */
app.use(express.json());

/* =======================
   GLOBAL DATA
======================= */
let problems = [];
let tfidf = new TfIdf();
let docVector = [];
let docMagnitude = [];

/* =======================
   LOAD DATA & BUILD INDEX
======================= */
async function loadProblemAndBuildIndex() {
  const data = await fs.readFile("./corpus/all_problems.json", "utf-8");
  problems = JSON.parse(data);

  tfidf = new TfIdf();
  docVector = [];
  docMagnitude = [];

  problems.forEach((problem, idx) => {
    const text = preprocess(
      `${problem.title} ${problem.title} ${problem.description || problem.discription || ""}`
    );
    tfidf.addDocument(text, idx.toString());
  });

  problems.forEach((_, idx) => {
    let sumSquares = 0;
    const vector = {};

    tfidf.listTerms(idx).forEach(({ term, tfidf: weight }) => {
      vector[term] = weight;
      sumSquares += weight * weight;
    });

    docVector[idx] = vector;
    docMagnitude[idx] = Math.sqrt(sumSquares) || 1;
  });

  console.log("✅ Index built successfully");
}

/* =======================
   SEARCH API
======================= */
app.post("/search", async (req, res) => {
  try {
    const rawQuery = req.body?.query;

    if (!rawQuery || typeof rawQuery !== "string") {
      return res.status(400).json({ error: "Invalid query" });
    }

    const query = preprocess(rawQuery);
    const tokens = query.split(" ").filter(Boolean);

    if (tokens.length === 0) {
      return res.json({ results: [] });
    }

    /* --- QUERY VECTOR --- */
    const termFreq = {};
    tokens.forEach(t => (termFreq[t] = (termFreq[t] || 0) + 1));

    const queryVector = {};
    let sumSqQ = 0;
    const N = tokens.length || 1;

    for (const [term, count] of Object.entries(termFreq)) {
      const tf = count / N;
      const idf = tfidf.idf(term);
      const weight = tf * idf;

      queryVector[term] = weight;
      sumSqQ += weight * weight;
    }

    const queryMag = Math.sqrt(sumSqQ) || 1;

    /* --- COSINE SIMILARITY --- */
    const scores = problems.map((_, idx) => {
      const docVec = docVector[idx];
      const docMag = docMagnitude[idx] || 1;

      let dot = 0;
      for (const term in queryVector) {
        if (docVec[term]) {
          dot += queryVector[term] * docVec[term];
        }
      }

      return { idx, score: dot / (queryMag * docMag) };
    });

    const results = scores
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(({ idx }) => {
        const p = problems[idx];
        return {
          ...p,
          platform: p.url.includes("leetcode.com")
            ? "LeetCode"
            : "Codeforces"
        };
      });

    return res.json({ results });

  } catch (err) {
    console.error("SEARCH ERROR:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/* =======================
   STATIC FILES
======================= */
app.use(express.static("public"));

/* =======================
   START SERVER
======================= */
async function startServer() {
  try {
    await loadProblemAndBuildIndex();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
  }
}

startServer();
