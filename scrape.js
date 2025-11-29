import puppeteer from "puppeteer";
import fsPromises from "fs/promises"


async function scrapleetcode() {
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ["--disable-blink-features=AutomationControlled"],
    });



    const page = await browser.newPage()
    await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
        "AppleWebKit/537.36 (KHTML, like Gecko) " +
        "Chrome/114.0.5735.199 Safari/537.36"
    );

    await page.goto("https://leetcode.com/problemset/", { waitUntil: "domcontentloaded" })
    const problemSelector = '.group.flex.flex-col.rounded-\\[8px\\].duration-300';

    let allProblem = []
    let prevCount = 0;
    const target = 200;

    while (allProblem.length < target - 2) {
        await page.evaluate((sel) => {
            const currProblemOnPage = document.querySelectorAll(sel)

            if (currProblemOnPage.length) {
                currProblemOnPage[currProblemOnPage.length - 1].scrollIntoView({
                    behavior: "smooth",
                    block: "end"
                })
            }
        }, problemSelector);

        await page.waitForFunction((sel, prev) =>
            document.querySelectorAll(sel).length > prev,
            {}, problemSelector, prevCount)
        allProblem = await page.evaluate((sel) => {
            const nodes = Array.from(document.querySelectorAll(sel))
            return nodes.map((ele) => ({

                title: ele.textContent.trim(),
                url: ele.href,

            }));
        }, problemSelector)
        prevCount = allProblem.length;
    }
    // console.log(allProblem)
    console.log(allProblem.length)


    const problemWithDisc = [];
    for (let i = 0; i <= 5; i++) {
        const problemPage = await browser.newPage()

        const { title, url } = allProblem[i]
        try {
            await problemPage.goto(url)

            let description = await problemPage.evaluate(() => {
                const descriptionDiv = document.querySelector('div.elfjS[data-track-load="description_content"]')


                const paragraphs = descriptionDiv.querySelectorAll("p");
                let collectedDescription = [];
                for (const p of paragraphs) {
                    if (p.innerHTML.trim() === "&nbsp;") {
                        break;
                    }
                    collectedDescription.push(p.innerText.trim());
                }
                return collectedDescription.filter((text) => text !== "").join(" ");
            })
            problemWithDisc.push({ title, url,description  });
        }
        catch (err) {
            console.error(`error factiing the description${title}(${url})`)
        }
        finally {
            await problemPage.close();

        }
    }
    console.log(problemWithDisc)
    await fsPromises.mkdir("./problems", { recursive: true });

    await fsPromises.writeFile(
        "./problems/Leetcode_problems.json",
        JSON.stringify(problemWithDisc, null, 2),{recursive: true}
    )
    await browser.close();
}





async function scrapcodeForce() {
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: ["--disable-blink-features=AutomationControlled"],
    });



    const page = await browser.newPage()
    await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
        "AppleWebKit/537.36 (KHTML, like Gecko) " +
        "Chrome/114.0.5735.199 Safari/537.36"
    );

    const problemSelector = "table.problems tr td:nth-of-type(2) > div:first-of-type > a";

    let allProblem = []
    let prevCount = 0;
    const target = 2;
    let links = []

    for (let i = 1; i < target; i++) {
        let url = `https://codeforces.com/problemset/page/${i}`
        await page.goto(url, { waitUntil: "domcontentloaded" })
        links = await page.evaluate((sel) => {
            const anchor = document.querySelectorAll(sel)
            return Array.from(anchor).map((a) =>
                a.href
            )
        }, problemSelector)
    }
   

    for (let i = 0; i < 2; i++) {
        const url_link = links[i];

        await page.goto(url_link, { waitUntil: "domcontentloaded" })
        const { title, description } = await page.evaluate(() => {
            let 
            title = document.querySelector(".problem-statement .title").textContent.split(". ")[1];
          
            const description = document.querySelector(
                ".problem-statement > div:nth-of-type(2)"
            ).textContent;

            return { title, description };

        })
        allProblem.push({title,url:url_link,description})
        


    }
    

    await fsPromises.mkdir("./problems", { recursive: true });

    await fsPromises.writeFile(
        "./problems/CodeForces_problems.json",
        JSON.stringify(allProblem, null, 2),{recursive: true }
    )
    await browser.close();





}




(async () => {
    await scrapleetcode();
    await scrapcodeForce();
})();