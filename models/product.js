const mongoose = require('mongoose');

let productScheme = new mongoose.Schema({
    title : String,
    newprice : String,
    oldprice : String,
    newstock : String,
    oldstock : String,
    sku : String,
    url : String,
    updatestatuc : String,
});

module.exports = mongoose.model('Product', productScheme);