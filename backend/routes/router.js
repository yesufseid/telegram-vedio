const express=require("express");
const router=express.Router();


const {getAccesse}=require('../controllers/accesse')




router.route("/").get(getAccesse)





module.exports=router;