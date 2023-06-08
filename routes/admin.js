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
            outOfStock,
            // deliveryNotAvailables,
            url
        }

    } catch(error) {
        console.log(error)
    }
}
// Get Routes
router.get('/', (req,res)=>{
    res.render('index')
});

router.get('/dashboard', isAuthenticatedUser,(req,res)=> {
    product.find({})
        .then(products => {
            res.render('./admin/dashboard', {products : products});
        })
});

router.get('/product/new', isAuthenticatedUser, async(req, res)=> {
    try {
        let url = req.query.search;
        if(url) { 
            browser = puppeteer.launch({ args: ['--no-sandbox'] });
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

router.get('/products/instock', isAuthenticatedUser, (req, res)=> {
    product.find({newstock : "In stock"})
        .then(products => {
            res.render('./admin/instock', {products : products});
        })
        .catch(err => {
            req.flash('error_msg', 'ERROR:' +err)
            res.redirect('/dahboard')
        })
})

router.get('/products/outofstock', isAuthenticatedUser, (req, res)=> {
    product.find({newstock : "Out of stock"})
        .then(products => {
            res.render('./admin/outofstock', {products : products});
        })
        .catch(err => {
            req.flash('error_msg', 'ERROR:' +err)
            res.redirect('/dahboard')
        })
})

router.get('/products/pricechanged', isAuthenticatedUser, (req, res)=> {
    product.find({})
        .then(products => {
            res.render('./admin/pricechanged', {products : products});
        })
        .catch(err => {
            req.flash('error_msg', 'ERROR:' +err)
            res.redirect('/dahboard')
        })
});

router.get('/products/backinstock', isAuthenticatedUser, (req, res)=> {
    product.find({$and: [{oldstock: 'Out of stock'}, {newstock : 'In stock'}]})
        .then(products => {
            res.render('./admin/pricechanged', {products : products});
        })
        .catch(err => {
            req.flash('error_msg', 'ERROR:' +err)
            res.redirect('/dahboard')
        })
});

router.get('/products/updated', isAuthenticatedUser, (req, res)=> {
    product.find({updatestatus : "Updated"})
        .then(products => {
            res.render('./admin/updatedproducts', {products : products});
        })
        .catch(err => {
            req.flash('error_msg', 'ERROR:' +err)
            res.redirect('/dahboard')
        })
})

router.get('/products/notupdated', isAuthenticatedUser, (req, res)=> {
    product.find({updatestatus : "Not Updated"})
        .then(products => {
            res.render('./admin/notupdatedproducts', {products : products});
        })
        .catch(err => {
            req.flash('error_msg', 'ERROR:' +err)
            res.redirect('/dahboard')
        })
})

router.get('/update', isAuthenticatedUser, (req,res)=> {
    res.render('./admin/update', {message : ''});
});
//POST routes

router.post('/product/new', isAuthenticatedUser, (req,res)=> {
    let {title, price, url, sku} = req.body

    let newProduct = {
        title : title,
        newprice : price,
        oldprice : price,
        newstock : stock,
        oldstock : stock,
        sku : sku,
        url : url,
        updatestatus : "Updated"
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

router.post('/update', isAuthenticatedUser, async(req, res)=>{
    try {
        res.render('./admin/update', {message: 'update started.'});

        product.find({})
            .then(async products => {
                for(let i=0; i<products.length; i++) {
                    Product.updateOne({'url' : products[i].url}, {$set: {'oldprice' : products[i].newprice, 'oldstock' : products[i].newstock, 'updatestatus' : 'Not Updated'}})
                        .then(products => {})
                }

                browser = await puppeteer.launch({ args: ['--no-sandbox'] });
                const page = await browser.newPage();

                for(let i=0; i<products.length; i++) {
                    let result = await scrapeData(products[i].url,page);
                    Product.updateOne({'url' : products[i].url}, {$set: {'title' : result.title, 'newprice' : '$'+result.price, 'newstock' : result.stock, 'updatestatus' : 'Updated'}})
                        .then(products => {})
                }

                browser.close();

            })
            .catch(err => {
                req.flash('error_msg', 'ERROR: '+err);
                res.redirect('/dashboard');
            });
        
    } catch (error) {
        req.flash('error_msg', 'ERROR: '+err);
        res.redirect('/dashboard');
    }
});

//Delete route
router.delete('/delete/product/:id', isAuthenticatedUser, (req,res)=> {
    let searchQuery = {_id : req.params.id};

    product.deleteOne(searchQuery)
        .then(product => {
            req.flash('success_msg', 'Product Deleted Successfully'+err);
            res.redirect('/dashboard');

        })
        .catch(err => {
            req.flash('error_msg', 'ERROR: '+err);
            res.redirect('/dashboard');
        })
})

router.get('*', (req,res)=> {
    res.render('./admin/notfound');
});


module.exports = router