// import puppeteer from "puppeteer";
//  async function scrapQoutes() {
//     const browser =  await puppeteer.launch({
//         headless: false,
//         defaultViewport:null
//     });
//     const page = await browser.newPage();
//     await page.goto("https://quotes.toscrape.com/",{waitUntil: "domcontentloaded",})
        
//             const qoutes = await page.evaluate(()=>
//                 {
//             const qouteslist = document.querySelectorAll(".quote")
//             return Array.from(qouteslist).map((qoute)=>{
//                 const text = qoute.querySelector(".text").innerText
//                 const auther =qoute.querySelector(".author").innerText
//                 return {text,auther}
//             })
//         })
        
//     console.log(qoutes);
//     await browser.close()
    
//  }
//  scrapQoutes()





import express from "express"
import fs from "fs/promises"
import pkg from "natural"


import preprocess from "./utils/preprocess.js"

const {TfIdf} = pkg
const app = express();
const PORT = process.env.PORT||3000;
app.use(express.json()) 
app.use(express.static("."))


let problems=[]
let tfidf =new TfIdf();


let docVector = []
let docMagnitude = [];
async function loadProblemAandBildIndex() {
    const data = await fs.readFile("./corpus/all_problems.json","utf-8")
    problems = JSON.parse(data)
    
    tfidf = new TfIdf();

    problems.forEach((problem,idx) => {
        const text = preprocess(`${problem.title} ${problem.title} ${problem.description || problem.discription || ""}`)

        tfidf.addDocument(text,idx.toString());

    });
    docVector=[];
    docMagnitude=[];
    problems.forEach((_,idx)=>
        {
            const vector = {}
            let sumSquares =0;
            tfidf.listTerms(idx).forEach(({term,tfidf:weight})=>
                {
                    vector[term]=weight;
                    sumSquares+=weight*weight
                    

                })
                docVector[idx]=vector;
                docMagnitude[idx]=Math.sqrt(sumSquares);

        })
    
}

app.post("/search",async(req,res)=>
    {
        
        const rawQuery = req.body.query;
        
        if(!rawQuery|| typeof rawQuery !== "string")
            {
                return res.status(400).json({error:"Missing or invalid 'quary' "})
            } 
        const quary = preprocess(rawQuery)
        const tokens = quary.split(" ").filter(Boolean)
        console.log(tokens)

        const termFreq={}
        tokens.forEach((t)=>{
            termFreq[t]=(termFreq[t]||0)+1;
        })
        const quaryVector={}
        let sumSqQ=0
        const N = tokens.length;
        Object.entries(termFreq).forEach(([term,count])=>
            {
                const tf=count/N;
                const idf = tfidf.idf(term)
                const w = tf*idf;
                quaryVector[term]=w
                sumSqQ+=w*w;

            })
        const quaryMag = Math.sqrt(sumSqQ)||1;
        
        


        const scores = problems.map((_,idx)=>
            {
                const docVec=docVector[idx];
                const docMag = docMagnitude[idx]||1;
                let dot = 0;
                

                for (const [term,wq]of Object.entries(quaryVector))
                    {
                        if(docVec[term])
                            {
                                dot+=wq*docVec[term]

                            }
                    }
                const cosin = dot/(quaryMag*docMag)
                return{idx,score:cosin}


            })
            console.log(scores)
            const top = scores
            .filter((s)=>s.score>0)
            .sort((a,b)=>b.score-a.score)
            .slice(0,10)
            .map(({idx})=>
                {
                    const p = problems[idx];
                    const platform = p.url.includes("leetcode.com")? "LeetCode":"Codeforces"
                    return{...p,platform}

                })
            res.json({results:top})


    })
loadProblemAandBildIndex().then(()=>
        {
            app.listen(PORT,()=>{
                console.log(`server is runing on port ${PORT}`)
            })
        })