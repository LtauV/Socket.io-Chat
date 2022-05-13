// sql imports
import { RowDataPacket } from 'mysql2';
import { db } from "./db";

// style console
import { color } from "./bashColor"

// export history
import fs from "fs";

const date = new Date(Date.now());

const exportHistory = (name: string, data: string) => {
    const formattedData = data.replace(',', '')
    fs.writeFileSync(`${name}.txt`, formattedData);
};

export class cmd {


    static listRooms = () => {

        db.query('SELECT * FROM rooms ORDER BY idroom', (error, result) => {

            const list = <RowDataPacket>result;

            console.table(
                list.map((elem: any) => {
                    return {
                        "id": elem.idroom,
                        "nom": elem.name
                    };
                })
            );
        })
    }

    static help = () => {

        const list = [
            ["--help", "Retourne la liste des commandes"],
            ["--rooms", "Retourne la liste des salons existants"],
            ["--history", "Retourne vos 20 derniers messages publics"],
            ["--phistory", "Retourne vos messages privés"],
            ["--friends", "Retourne votre liste de vos amis"],
            ["--current", "Retourne votre salon actuel"],
            ["--join <room>", "Rejoindre un salon"],
            ["--leave <room>", "Sortir d'un salon'"],
            ["--create <room>", "Créer un salon"],
            ["--add <login>", "Ajouter un ami"],
            ["--remove <login>", "Retirer de vos amis"],
            ["--private <login> <msg>", "Envoyer un message privé à une personne"],
            ["--online","Liste les users connectés"],
            ["--quit", "Se déconnecter de l'application"],
            ["--clear", "Nettoyer l'affichage à la fenêtre"],
        ]

        console.table(
            list.map((elem: any) => {
                return {
                    "cmd": elem[0],
                    "descritpion": elem[1]
                };
            })
        );
    }

    static history = (userId: number) => {

        db.query("SELECT * from messages where user_id =? ORDER BY createdAt LIMIT 20", userId, (error, result) => {

            var list = <RowDataPacket>result;
            var historyData: string = "";

            if (list.length >= 1) {
                console.table(
                    list.map((elem: any) => {
                        return {
                            "message": elem.content,
                            "date": elem.createdAt
                        };
                    })
                );
                list.map((msg: any) => {
                    historyData = historyData + `Room: ${msg.room_id} - Message: ${msg.content} - Date: ${msg.createdAt}\n`
                })
                exportHistory(`History ${date}`, historyData)
            } else {
                console.log(color.yellow + color.italic + "Vous n'avez aucun message à afficher, --join 'room' pour commencer à discuter\n" + color.reset)
            }
        })
    }

    static privateHistory = (userId: number) => {

        db.query("SELECT * from private where user_id =? LIMIT 20", userId, (error, result) => {

            const list = <RowDataPacket>result;
            var historyData: string = "";

            if (list.length >= 1) {
                console.table(
                    list.map((elem: any) => {
                        return {
                            "name": elem.dest_login,
                            "message": elem.content,
                            "date": elem.createdAt,
                        };
                    })
                );
                list.map((msg: any) => {
                    historyData = historyData + `À: ${msg.dest_login} - Message: ${msg.content} - Date: ${msg.createdAt}\n`
                })
                exportHistory(`History ${date}`, historyData)
            } else {
                console.log(color.yellow + color.italic + "Vous n'avez aucun message à afficher, --join 'room' pour commencer à discuter\n" + color.reset)
            }
        })
    }

    static friendsList = (userId: number) => {

        db.query(`SELECT * FROM users INNER JOIN marks ON users.user_id = marks.user2_id OR users.user_id = marks.user1_id WHERE marks.user1_id = ${userId} OR marks.user2_id = ${userId} ORDER BY login`, (error, result) => {

            const list = <RowDataPacket>result;
            var arr:any[] = [];

            list.map((el:any) => {
                if(el.user_id != userId) {
                    arr.push(el)
                }
            })

            if (list.length >= 1) {
                console.table(
                    arr.map((elem: any) => {
                        return {
                            "message": elem.login
                            };
                    })
                );
            } else {
                console.log(color.yellow + color.italic + "Vous n'avez aucun ami à afficher pour le moment, --private 'name' pour envoyer des messages privés\n" + color.reset)
            }
        })
    }
}