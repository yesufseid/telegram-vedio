const experss=require("express");
const http = require("http");
const { initializeWebSocket} = require("./utils/socket-server");



const bodyparser=require("body-parser");
require("dotenv").config()
const router=require("./routes/router")
const errorHendlerFunction=require("./middleware/error-hendler")
const notFound=require("./middleware/not-found")
var cors = require('cors')
//////
const app = experss();
const server = http.createServer(app); // combine express with WS
initializeWebSocket(server); // Attach WS to HTTP server

//middlware
app.use(experss.json({limit: '25mb'}));
// app.use(bodyparser.urlencoded({extended:true}))
app.use(cors())
//routes
app.use("/",router);
app.use(notFound)



// Start server
const PORT = process.env.PORT || 3005;
server.listen(PORT, "0.0.0.0" ,() => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});