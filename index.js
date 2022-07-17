"use strict";

const express = require('express')
const mongoose = require("mongoose")
const dotenv = require("dotenv")
const helmet = require("helmet")
const morgan = require("morgan")
const cors = require('cors')
const http = require("http")
const { v4: uuidv4 } = require('uuid')
const WebSocket = require("ws")

const app = express()
app.use(cors())
const server = http.createServer(app)
const wss = new WebSocket.Server({ server })
const serverPort = 5000

let wsClients = [];

const jwt = require('jsonwebtoken');
const userRoutes = require("./Routes/User");
const { clearInterval } = require('timers');
dotenv.config()

async function dbConnection() {
    mongoose.set('useFindAndModify', false);
    await mongoose.connect(process.env.DB_URL, { useFindAndModify: false, useUnifiedTopology: true, useNewUrlParser: true, useCreateIndex: true })
}

dbConnection().then(res => { console.log("DB CONNECTED") }).catch(err => console.log(err));

app.use(cors())
app.use(express.json())
app.use(helmet())
app.use(morgan("common"))
app.use("/auth/user", userRoutes)

wss.on("close", () => {
    clearInterval(clearDeadSockets);
})

/**when a websocket connection is established**/
wss.on('connection', (ws, req) => {
    // console.log("SOCK: ", ws)
    ws.send(JSON.stringify({ "msgType": "selfAuth" }));

    ws.on('close', () => { wss.clients.delete(this) })
    //forward message
    ws.on('message', data => {

        data = JSON.parse(data);
        const msgType = data.msgType

        if (msgType === "userAuth") {
            let userid = data.ID
            let authToken = data.TOKEN;

            /**Vaidate userToken*/
            const user_id = jwt.verify(authToken, process.env.SECRET);
            //console.log("USER_ID", user_id)
            if (userid === user_id.id) {
                let clients = []
                wss.clients.forEach(ws => {
                    if (ws.id == user_id.id) {
                        clients.push(ws);
                    }
                })

                if (clients.length === 0) {
                    ws.id = user_id.id
                    ws.lastAlive = Date.now()
                    ws.alive = true;
                    const authRes = {
                        msgType: "authState",
                        state: true
                    }
                    ws.send(JSON.stringify(authRes))
                }
            } else {
                const authRes = {
                    msgType: "authState",
                    state: false
                }
                ws.send(JSON.stringify(authRes))
            }

        } else if (msgType === "ping") {
            // console.log("GOT PING FROM: ", data)
            wss.clients.forEach(ws => {
                if (ws.id === data.id) {
                    ws.alive = true;
                    ws.lastAlive = Date.now()
                }
            })

            let activeClients = []
            wss.clients.forEach(socket => {
                if (Date.now() - socket.lastAlive < 10000) {
                    activeClients.push({ id: socket.id })
                }
            })
            wss.clients.forEach(ws => {
                ws.send(JSON.stringify({ msgType: "pong", activeContacts: activeClients }))
                //                 console.log("SENT_PONG: ", ws.id)
            })
        } else {
            //             console.log("COMM_DATA: ", data)
            let target = data.targetID
            let from = ws.id
            wss.clients.forEach(ws => {
                if (ws.id == target) {
                    ws.send(JSON.stringify(data))
                }
            })
        }
    });
});


// setInterval(() => {
//     console.log("ACTIVE_SOCKS: ",wss.clients.size)
// }, 5000);

// setInterval(() => {
//     wss.clients.forEach(ws=>{
//         console.log("ACTIVE_SOCK_ID: ",ws.id, "LAST_ALIVE: ", ws.lastAlive)
//     })
// }, 5000);


// clear dead sockets
const clearDeadSockets = setInterval(() => {
    wss.clients.forEach(socket => {
        if (Date.now() - socket.lastAlive >= 10000) {
            socket.close()
        }
    })
}, 3000)

//start the web server
server.listen(process.env.PORT || serverPort, function () {
    console.log("API RUNNING")
    console.log(`Websocket server started on port ` + serverPort)
})
