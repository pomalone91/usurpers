// run node.js server: npx tsx app.ts
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
import {Role, type Player, assign_roles} from './game.ts'
import { DiscordRequest, build_player_list_message, send_pre_game_player_list } from './utils.js'

const app = express()
const port = 3000

// Stuff for the game itself
var players: Player[] = []; // Array of userId to represent the players who have joined.

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

        // switch the name to determine what to do
        switch(name) {
            case 'usurpers':
                // Get user IDs and stuff
                const context = req.body.context;
                const userId = context === 0 ? req.body.member.user.id : req.body.user.id;

                return res.send({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        flags: InteractionResponseFlags.IS_COMPONENTS_V2,
                        components: [
                            {
                                type: MessageComponentTypes.TEXT_DISPLAY,
                                content: `<@${userId}> has started a new game`
                            },
                            {
                                type: MessageComponentTypes.ACTION_ROW,
                                components: [
                                    {
                                        type: MessageComponentTypes.BUTTON,
                                        custom_id: `join_button_${req.body.id}`,
                                        label: 'Join',
                                        style: ButtonStyleTypes.PRIMARY
                                    }
                                ]
                            }
                        ]
                    }
                });
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

                // Build the message text
                const message = build_player_list_message(players);
                try {
                    // send the message
                    send_pre_game_player_list(message, req, res);
                    // Delete the previous message
                    const endpoint = `webhooks/${process.env.APP_ID}`
                        + `/${req.body.token}/messages`
                        + `/${req.body.message.id}`;
                    await DiscordRequest(endpoint, { method: 'DELETE' });
                } catch(err) {
                    console.error('Error sending message: ', err);
                }
            }
        }
        /**
            * Start button was clicked
        */
        if (componentId.startsWith('start_button_')) {
            // Assign roles to each player
            players = assign_roles(players);
            const endpoint = `webhooks/${process.env.APP_ID}/${req.body.token}/messages/${req.body.message.id}`;

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

            var removal_message = `<@${userId}> has removed themselves from the game\n\n`;
            var player_list_message = removal_message + build_player_list_message(players);

            // Send player_list message
            try {
                // send the message
                send_pre_game_player_list(player_list_message, req, res);
                // Delete the previous message
                const endpoint = `webhooks/${process.env.APP_ID}`
                    + `/${req.body.token}/messages`
                    + `/${req.body.message.id}`;
                await DiscordRequest(endpoint, { method: 'DELETE' });
            } catch(err) {
                console.error('Error sending message: ', err);
            }
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
            const endpoint = `webhooks/${process.env.APP_ID}/${req.body.token}/messages/${req.body.message.id}`;
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
    }
});

// Start listening
app.listen(port, () => {
    console.log(`Listening on port ${port}`)
})
