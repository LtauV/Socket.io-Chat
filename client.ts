// servers imports
import { io } from "socket.io-client"

// readline imports
import * as readline from 'node:readline';

// socket path listener
const socket = io("ws://localhost:3000");

// style for bash
import { color } from "./bashColor"
var figlet = require('figlet');

// initialize readline
const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });

// regex
const regex = /[a-zA-Z0-9#?!@$ %^&*-]/

// import { cmd } from "./cmd";
import { cmd } from "./cmd"

socket.on("connection", (res) => {

    console.log(color.magenta + "\n" + res)
    console.log(color.magenta + figlet.textSync("My_Chat!", { font: 'Calvin S' }));
    rl.question(color.bold + color.italic + color.magenta + "entrez votre pseudo ici: " + color.reset, (userInput) => {
        if (userInput) {
            socket.emit("auth", userInput)
        } else {
            rl.setPrompt("Unauthorized login, please do it again: ");
            rl.prompt();
            rl.on('line', (userInput) => {
                if (userInput) {
                    socket.emit("auth", userInput)
                } else {
                    rl.setPrompt("Unauthorized login, please do it again: ");
                    rl.prompt();
                }
            })
        }
        rl.pause()
    })
})

socket.on("chat", (roomSize, username, userId) => {

    rl.setPrompt('')
    rl.prompt();

    if (roomSize == 1) {
        console.log("\n" + color.cyan + color.italic + "Vous êtes dans la salle d'attente, --help pour voir les commandes, --join \'room' pour rejoindre une room:\n" + color.reset)
    };

    rl.on('line', (answer: string) => {
        if (!answer) {
            rl.setPrompt('')
            rl.prompt();
        } else {
            const params = answer.split(' ');
            switch (params[0]) {
                case ("--help"): {
                    cmd.help()
                    break
                }
                case ("--rooms"): {
                    cmd.listRooms()
                    break
                }
                case ("--history"): {
                    cmd.history(userId);
                    break
                }
                case ("--phistory"): {
                    cmd.privateHistory(userId);
                    break
                }
                case ("--friends"): {
                    cmd.friendsList(userId);
                    break
                }
                case ("--current"): {
                    socket.emit("currentRoom");
                    break
                }
                case ("--join"): {
                    var request = answer.replace('--join ', '')
                    socket.emit("joinRoom", request, username, userId);
                    break
                }
                case ("--leave"): {
                    socket.emit("leaveRoom", username);
                    break
                }
                case ("--create"): {
                    var request = answer.replace('--create ', '')
                    socket.emit("createRoom", request, username, userId);
                    break
                }
                case ("--add"): {
                    var request = answer.replace('--add ', '')
                    socket.emit("addFriend", request, userId);
                    break
                }
                case ("--remove"): {
                    var request = answer.replace('--remove ', '')
                    socket.emit("removeFriend", request, userId);
                    break
                }
                case ("--private"): {
                    if (params[2]) {
                        var request = params[1]
                        var msg = answer.replace('--private ' + request + ' ', '');
                        socket.emit("privateChat", msg, request, username, userId);
                        break
                    } else {
                        console.log(color.red + color.italic + "Veuillez préciser un message à envoyer\n" + color.reset)
                        break
                    }
                }
                case ("--online"): {
                    socket.emit("getUsers");
                    break
                }
                case ("--quit"): {
                    socket.emit("leaveChat");
                    break
                }
                case ("--clear"): {
                    for (let i = 0; i <= 10; i++) { console.log('\n') }
                    break
                }
                default: {
                    socket.emit("chat", answer, username, userId);
                    break
                }
            }

        }
    });
});

socket.on("serveurMessage", (msg) => {
    console.log(msg)
});

socket.on("privateMessage", (msg) => {
    console.log(msg)
});;

socket.on("roomMessage", (msg) => {
    console.log(msg)
});