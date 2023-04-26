const express = require('express');
const router = express.Router();
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

//requiring product model
let product = require('../models/product');

// check if user is authenticated
function isAuthenticatedUser(req, res, next) {
    if(req.isAuthenticated()) {
        return next();
    }
    req.flash('error_msg', 'Please Login first to access this page.')
    res.redirect('/login');
}

// Scrape function
async function scrapeData(url, page) {
    try {
        await page.goto(url, {waitUntil:FontFaceSetLoadEvent, timeout : 0});
        const html = await page.evaluate(()=> document.body.innerHTML);
        const $ = await cheerio.load(html);

        let title = $("h1").attr('content')    
        let price = $(".Price-characteristic").attr("content");
        
        if(!price) {
            let dollars = $('.Price-characteristic').textContent
            let cents = $('.Price-mantissa').textContent
            price = dollars+'.'+cents;
        }

        let outOfStock = '';
        let checkOutOfStock = $('.sc-pc-out-of-stock-button').textContent
        if(checkOutOfStock){
            outOfStock = checkOutOfStock
        }

        let deliveryNotAvailable = '';
        let checkDeliveryNotAvailable = $('.sc-pc-out-of-stock-button').textContent
        if(checkDeliveryNotAvailable){
            deliveryNotAvailable = checkOutOfStock
        }

        return {
            title,
            price,
            // outOfStock,
            // deliveryNotAvailable,
            url
        }

    } catch(error) {
        console.log(error)
    }
}


module.exports = router