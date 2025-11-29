import fsPromisses from "fs/promises"
import path from "path"
 

async function mergeProblemData() {
    const codeforcespath = path.resolve("./problems/CodeForces_problems.json")
    const leetCodepath = path.resolve("./problems/Leetcode_problems.json")
    const codeforcesData = JSON.parse(await fsPromisses.readFile( codeforcespath,"utf-8"))
    const LeetcodeData = JSON.parse(await fsPromisses.readFile( leetCodepath,"utf-8"))
    const combined =[...codeforcesData,...LeetcodeData]
    await fsPromisses.mkdir("./corpus",{recursive: true})
    await fsPromisses.writeFile("./corpus/all_problems.json",JSON.stringify(combined,null,2));
}
mergeProblemData();
