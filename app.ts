// run node.js server: npx tsx app.ts
// register (need to do when adding new commands): npm run register
// run ngrok: ngrok http http://localhost:3000
import 'dotenv/config' // Imports the .env file apparently
import express from "express"
import { 
    ButtonStyleTypes,
    InteractionResponseFlags,
    InteractionResponseType,
    InteractionType,
    MessageComponentTypes,
    verifyKeyMiddleware
} from "discord-interactions"
import { Role, type Player, assign_roles, Game, GameStatus } from './game.ts'
import { DiscordRequest, build_player_list_message, send_ephemeral_message, send_pre_game_player_list, send_already_joined_message } from './utils.js'

const app = express()
const port = 3000

// Stuff for the game itself
var players: Player[] = []; // Array of userId to represent the players who have joined.
var game: Game = { 
    host_id: 0, 
    players: players, 
    status: GameStatus.RECRUITING 
};

app.get('/', (req, res) => {
    res.send('Hello World!')
})

// Interaction handling
app.post('/interactions', verifyKeyMiddleware(process.env.PUBLIC_KEY!), async function (req, res) {
    // Information from the request
    const {id, type, data} = req.body;


    /************* Handle the request based on the type *************/
    /**
    * Handle verification pings
    */
    if (type === InteractionType.PING) {
        return res.send({ type: InteractionResponseType.PONG });
    }

    /**
    * Handle slash command requests
    */
    if (type === InteractionType.APPLICATION_COMMAND) {
        const { name } = data; // The name of the command, or what comes after the slash like /start
        const context = req.body.context;
        const userId = context === 0 ? req.body.member.user.id : req.body.user.id;
        //const endpoint = `webhooks/${process.env.APP_ID}`
        //    + `/${req.body.token}/messages`
        //    + `/${req.body.message.id}`;

        // switch the name to determine what to do
        switch(name) {
            case 'usurpers':
                // Get user IDs and stuff
                const host_player: Player = { userId: userId, role: Role.NONE, alive: true };

                game.players.push(host_player);
                game.host_id = userId;
                
                const message = build_player_list_message(players);

                try {
                    send_pre_game_player_list(message, req, res);
                } catch(err) {
                    console.log(err);
                }

            case 'join':
                const newPlayer: Player = { userId: userId, role: Role.NONE, alive: true };
                const foundPlayer: Player | undefined = players.find((player) => player.userId === newPlayer.userId);

                if (game === undefined) {
                    // There is no game to join
                    const message = 'There is no game to join. Use /usurpers to start one.';
                    send_ephemeral_message(message, res);
                } else if (foundPlayer?.userId === newPlayer.userId) {
                    try {
                        send_already_joined_message(res);
                    } catch (err) {
                        console.error('Error sending message:', err);
                    }
                } else {
                    // Add the new player
                    players.push(newPlayer);
                    const message = 'You have joined the game. Once the host starts it use /whoami to see your assigned role.';
                    send_ephemeral_message(message, res);
                }
            //case 'players':
            //    // Build the message text
            //    const message = build_player_list_message(players);
            //    try {
            //        // send the message
            //        send_pre_game_player_list(message, req, res);
            //        // Delete the previous message
            //            + `/${req.body.token}/messages`
            //            + `/${req.body.message.id}`;
            //        await DiscordRequest(endpoint, { method: 'DELETE' });
            //    } catch(err) {
            //        console.error('Error sending message: ', err);
            //    }
            default:
                console.log('Invalid command');
        }
    }

    /**
        * Handle button interactions and stuff
    */
    if (type === InteractionType.MESSAGE_COMPONENT) {
        // Get the custom_id from the interaction so we know what they did. 
        const componentId = data.custom_id;
        const context = req.body.context;
        const userId = context === 0 ? req.body.member.user.id : req.body.user.id;
        const endpoint = `webhooks/${process.env.APP_ID}`
            + `/${req.body.token}/messages`
            + `/${req.body.message.id}`;
        //const gameId = componentId.replace('join_button_', '');

        /**
            * Someone clicked the join button
        */
        if (componentId.startsWith('join_button_')) {
            // Create the new player from message components. 
            const newPlayer: Player = { userId: userId, role: Role.NONE, alive: true};
            const foundPlayer: Player | undefined = players.find((player) => player.userId === newPlayer.userId);
            if (foundPlayer?.userId === newPlayer.userId) {
                console.log('Found userId');
                // Player was found to have joined already. Send an ephemeral message letting them know. 
                try {
                    res.send({
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: {
                            flags: InteractionResponseFlags.EPHEMERAL | InteractionResponseFlags.IS_COMPONENTS_V2,
                            components: [
                                {
                                    type: MessageComponentTypes.TEXT_DISPLAY,
                                    content: `You have already joined the game! Use "Remove" to remove yourself.`
                                }
                            ]
                        }
                    });
                } catch(err) {
                    console.error('Error sending message:', err);
                }
            } else {
                // Add the new player
                players.push(newPlayer);

                console.log(players);

                // Send ephemeral message letting player know they joined
                const message = 'You have joined the game.\nUse "Remove" to remove yourself.\nUse "Bump" to update the player list message.\nOnce the host starts it use "Who Am I" to see your assigned role.';
                send_ephemeral_message(message, res);

            }
        }
        /**
            * Start button was clicked
        */
        if (componentId.startsWith('start_button_')) {
            // Assign roles to each player
            players = assign_roles(players);

            // Build the message text
            var player_list_message = ''
            const monarch = players.find((player) => player.role === Role.MONARCH);
            const player_count_message = `Player count: ${players.length}\n`;
            const monarch_message = `The game has begun! <@${monarch?.userId}>, you are the monarch!\n\nYour loyal subjects...\n`;
            for (var i = 0; i < players.length; i++) {
                if (players[i].role != Role.MONARCH) {
                    player_list_message += `<@${players[i].userId}>\n`;
                }
            }
            const end_of_message = '\nClick "Who Am I?" for your role';
            const message = player_count_message + monarch_message + player_list_message + end_of_message;
            try {
                res.send({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        flags: InteractionResponseFlags.IS_COMPONENTS_V2,
                        components: [
                            {
                                type: MessageComponentTypes.TEXT_DISPLAY,
                                content: message
                                //content: `<@${newPlayer.userId}> has joined game session ${gameId} with role ${newPlayer.role}`
                            },
                            // End Button
                            {
                                type: MessageComponentTypes.ACTION_ROW,
                                components: [
                                    {
                                        type: MessageComponentTypes.BUTTON,
                                        custom_id: `who_am_i_${req.body.id}`,
                                        label: 'Who Am I?',
                                        style: ButtonStyleTypes.PRIMARY
                                    },
                                    {
                                        type: MessageComponentTypes.BUTTON,
                                        custom_id: `end_button_${req.body.id}`,
                                        label: 'End',
                                        style: ButtonStyleTypes.DANGER
                                    }

                                ]
                            },
                        ]
                    },
                });
            await DiscordRequest(endpoint, { method: 'DELETE' });
            } catch(err) {
                console.error('Error sending message: ', err);
            }
        }

        /**
            * Remove button clicked
        */
        if (componentId.startsWith('remove_button_')) {
            const found_index = players.findIndex((player) => player.userId === userId);
            players.splice(found_index, 1);
            console.log(players);

            var removal_message = `You have removed yourself from the game. Use "Bump" to view the updated player list.\n\n`;

            send_ephemeral_message(removal_message, res);
            // Send player_list message
            
            //try {
            //    // send the message
            //    send_pre_game_player_list(player_list_message, req, res);
            //    // Delete the previous message
            //        + `/${req.body.token}/messages`
            //        + `/${req.body.message.id}`;
            //    await DiscordRequest(endpoint, { method: 'DELETE' });
            //} catch(err) {
            //    console.error('Error sending message: ', err);
            //}
        }

        /**
            * Who am I button was clicked
        */
        if (componentId.startsWith('who_am_i_')) {
            const user_role = players.find((player) => player.userId === userId)?.role;
            try {
                res.send({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        flags: InteractionResponseFlags.EPHEMERAL | InteractionResponseFlags.IS_COMPONENTS_V2,
                        components: [
                            {
                                type: MessageComponentTypes.TEXT_DISPLAY,
                                content: `${user_role}`
                            }
                        ]
                    }
                });
            } catch(err) {
                console.error('Error sending message:', err);
            }
        }

        /**
            * End button clicked
        */
        if (componentId.startsWith('end_button_')) {
            players = [];
            try {
                res.send({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        flags: InteractionResponseFlags.IS_COMPONENTS_V2,
                        components: [
                            {
                                type: MessageComponentTypes.TEXT_DISPLAY,
                                content: `The battle is over. Someone is the monarch, perhaps even the same person as before.`
                            }
                        ]
                    }
                });
            await DiscordRequest(endpoint, { method: 'DELETE' });
            } catch(err) {
                console.error('Error sending message:', err);
            }
        }
        
        /**
            * Bump button
        */
        if (componentId.startsWith('bump_button_')) {
            try {
                const message = build_player_list_message(players);
                send_pre_game_player_list(message, req, res);
                await DiscordRequest(endpoint, { method: 'DELETE' });
            } catch (err) {
                console.error('Error sending message: ', err);
            }
        }
    }
});

// Start listening
app.listen(port, () => {
    console.log(`Listening on port ${port}`)
})
