const express = require("express");
const router = express.Router();
const {getAllProduct, addProduct, updateProduct, deleteProduct, findProduct , uploadProductImage , productImage} = require("../../controllers/bussinessOwnerControllers/onlineMenu")

router.get("/business-owner/online-menu/all-products",getAllProduct);
router.post("/business-owner/online-menu/add-product",addProduct);
router.put("/business-owner/online-menu/update-product",updateProduct);
router.delete("/business-owner/online-menu/delete-product",deleteProduct)
router.get("/business-owner/online-menu/get-product",findProduct)
router.post("/business-owner/online-menu/upload-product-image", uploadProductImage.single("productImage") , productImage)


module.exports = router;