const jwt = require("jsonwebtoken");
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()


const verifyToken =(req, res, next) => {

  if (req.headers && req.headers.authorization && req.headers.authorization) {
     jwt.verify(req.headers.authorization, process.env.API_SECRET, function (err, decode) {
      if (err) req.user = undefined;

      const user= prisma.user.findUnique({
        where: {
          id:decode.id,
        },
      })
      if (!user){
        const error={
          message:`file not found in this  ${Taskid} id`,
          status:404
        }
        res.status(404).json({msg:error})
      }
    
      req.user = user;
             next();
    });
  } else {
    req.user = undefined;
    next();
  }
};
module.exports = verifyToken;