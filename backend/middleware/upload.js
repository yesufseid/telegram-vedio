const multer=require("multer")

const storage=multer.diskStorage({
    destination:function(req,file,cb){
        return cb(null,"./public/Images")
    },
    filename:function(req,file,cb){
        return cb(null,`${Date.now()}_${file.originalname}}`)
    }
})

const upload=multer({storage})



module.exports=upload