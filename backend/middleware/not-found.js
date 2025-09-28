const notFound=(req,res)=>{
    return res.status(404).json("file not found")
}


module.exports=notFound