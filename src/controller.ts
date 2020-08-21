import { Page, Browser } from 'puppeteer';
const puppeteer = require('puppeteer');
const scrollDown = require('puppeteer-autoscroll-down');

module.exports = async (id: string) => {

    const browser: Browser = await puppeteer.launch({
        headless: true
    });

    const page: Page = await browser.newPage();

    let connectionSentCount = 0;

    await page.goto("https://www.linkedin.com/login?fromSignIn=true&trk=guest_homepage-basic_nav-header-signin");

    page.waitForSelector(".login__form");

    await page.type("#username", process.env.linkedInUserName!); // 
    await page.type("#password", process.env.linkedInPassword!); //"

    await page.keyboard.press("Enter");

    await page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 0 });

    await page.goto(`https://www.linkedin.com/in/${id}`, { timeout: 0 });

    await page.waitForSelector("[data-control-name=topcard_view_all_connections]", { timeout: 0 });

    await page.click("[data-control-name=topcard_view_all_connections]", { clickCount: 1 });

    await page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 0 });


    while (true) {

        await page.waitForSelector(".search-results__list", { timeout: 0 });

        await scrollDown(page);

        await page.waitForSelector(".artdeco-pagination");

        const connections = await page.evaluate(selector => {
            const allConnections = Array.from(document.querySelectorAll(selector));
            const validConnections = allConnections.filter(connection => {
                if (!connection.querySelector(".search-result__action-button")?.getAttribute("aria-label")?.includes("Connect")) {
                    return false;
                }
                const filteredKeywords = ['HR', 'hr', 'recruitment', 'recruit', 'talent', 'Technical', 'recruitment', 'Recruiting',
                    'hiring', 'hire', 'Talent Acquisition', 'human', 'resource', 'human resource', 'Acquisition', 'resource', 'talent'];

                return filteredKeywords.some(text => {
                    return connection?.innerText?.toLowerCase()?.match(text?.toLowerCase());
                })

            });
            return validConnections.map(con => con.querySelector(".search-result__image-wrapper > a[data-control-name='search_srp_result']")?.href);
        }, ".search-result__wrapper")

        console.log({ connections });

        connections.forEach(async con => {

            let newPage: Page = await browser.newPage();;

            try {

                await newPage.goto(con, { waitUntil: "domcontentloaded" });

                await newPage.waitForSelector(".pv-top-card .pv-s-profile-actions.pv-s-profile-actions--connect");

                const invitationAlreadySent = await newPage.evaluate(selectors => {

                    return (selectors as string[]).some(selector => document.querySelector(selector)?.hasAttribute("disabled"))

                }, [".pv-top-card .pv-s-profile-actions.pv-s-profile-actions--connect", ".pv-s-profile-actions.pv-s-profile-actions--message"])

                if (invitationAlreadySent) {
                    console.log("invitation has been sent already to this connection");
                    await newPage.close();
                } else {

                    await newPage.click(".pv-top-card .pv-s-profile-actions.pv-s-profile-actions--connect", { clickCount: 2 });

                    await newPage.waitForSelector("div[data-test-modal] button[aria-label='Send now']");

                    await newPage.click("div[data-test-modal] button[aria-label='Send now']");

                    await newPage.waitForResponse("https://www.linkedin.com/voyager/api/growth/normInvitations");

                    console.log("invitation sent");
                    connectionSentCount++;
                    await newPage.close();
                }

            } catch (error) {
                console.log({ con, error });
                await newPage.close();
            }
        });

        await page.waitForSelector("button[aria-label='Next']");

        const isNextBtnDisblaed = await page.evaluate(selector => {
            return document.querySelector("button[aria-label='Next']")?.hasAttribute("disabled");
        }, "button[aria-label='Next']");

        if (!isNextBtnDisblaed) {
            console.log('Request sent to ', connectionSentCount);
            await page.click("button[aria-label='Next']");
        } else {
            console.log("invitation sent to all connections");
            // process.exit(1);
        }
    }
};