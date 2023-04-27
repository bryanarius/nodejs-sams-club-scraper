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

let browser;
// Scrape function
async function scrapeData(url, page) {
    try {
        await page.goto(url, {waitUntil:'load', timeout : 0});
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
// Get Routes
router.get('/product/new', isAuthenticatedUser, async(req, res)=> {
    try {
        let url = req.query.search;
        if(url) { 
            browser = puppeteer.launch({headless : flase});
            const page = (await browser).newPage();
            let result = await scrapeData(url,page);
            let productData = {
                title : result.title,
                price : '$' +result.price,
                productUrl : result.url
            };
            res.render('./admin/newproduct', {productData : productData});
            browser.close()
        } else {
            let productData = {
                title : "",
                price : "",
                productUrl : ""
            };
            res.render('./admin/newproduct', {productData : productData});
        }
        
    } catch(error) {
        req.flash('error_msg', 'ERROR: ' +error);
        res.redirect('/product/new');
    }
});

router.get('/product/search', isAuthenticatedUser, (req,res)=> {
    let userSku = req.query.sku;
    if(userSku) {
        product.findOne({sku : userSku})
        .then(product => {
            if(!product) {
                req.flash('error_msg', 'Product does not exist in the database');
                return res.redirect('/product/search');
            }
            res.render('./admin/search', {productData : product});
        })
        .catch(err => {
            req.flash('error_msg', 'ERROR: ' +err);
            res.redirect('/product/search');
        })
    } else {
        res.render('./admin/search', {productData : ''})
    }
})
//POST routes

router.post('/product/new', isAuthenticatedUser, (req,res)=> {
    let {title, price, url, sku} = req.body

    let newProduct = {
        title : title,
        newprice : price,
        sku : sku,
        url : url
    };

    product.findOne({ sku : sku})
    .then(product => {
        if(product) {
            req.flash('error_msg', 'Product already exist in the database')
            return res.redirect('/product/new');
        }

        product.create(newProduct)
            .then(product => {
                req.flash('success_msg', 'Product added successfully in the database')
                return res.redirect('/product/new');
            })
    })
    .catch(err => {
        req.flash('error_msg', 'ERROR: ' +err);
        res.redirect('/product/new');
    })
})


module.exports = router