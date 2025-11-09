import 'dotenv/config';
import { Role, type Player } from './game.ts'
import { Request, Response } from 'express';
import { 
    ButtonStyleTypes,
    InteractionResponseFlags,
    InteractionResponseType,
    MessageComponentTypes,
} from "discord-interactions"

// For making discord requests. I don't really know how all this works so I'm not going to change it. 
export async function DiscordRequest(endpoint, options) {
  // append endpoint to root API URL
  const url = 'https://discord.com/api/v10/' + endpoint;
  // Stringify payloads
  if (options.body) options.body = JSON.stringify(options.body);
  // Use fetch to make requests
  const res = await fetch(url, {
    headers: {
      Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'User-Agent': 'DiscordBot (https://github.com/discord/discord-example-app, 1.0.0)',
    },
    ...options
  });
  // throw API errors
  if (!res.ok) {
    const data = await res.json();
    console.log(res.status);
    throw new Error(JSON.stringify(data));
  }
  // return original response
  return res;
}

// This installs the commands to the server I think
export async function InstallGlobalCommands(appId, commands) {
    // API endpoint to overwrite global commands
    const endpoint = `applications/${appId}/commands`;

    try {
        // This is calling the bulk overwrite endpoint: https://discord.com/developers/docs/interactions/application-commands#bulk-overwrite-global-application-commands
        await DiscordRequest(endpoint, { method: 'PUT', body: commands });
    } catch (err) {
        console.error(err);
    }
}

// Function to build the player list message
export function build_player_list_message(players: Player[]) {
    var player_list_message = ''
    const player_count_message = `Player count: ${players.length}\n`;
    for (var i = 0; i < players.length; i++) {
        player_list_message += `<@${players[i].userId}>\n`
    }
    const message = player_count_message + player_list_message;

    return message;
}

export function send_pre_game_player_list(message: string, req: Request, res: Response) {
    res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
            flags: InteractionResponseFlags.IS_COMPONENTS_V2,
            components: [
                {
                    type: MessageComponentTypes.TEXT_DISPLAY,
                    content: message
                },
                // Buttons
                {
                    type: MessageComponentTypes.ACTION_ROW,
                    components: [
                        // Join Button
                        {
                            type: MessageComponentTypes.BUTTON,
                            custom_id: `join_button_${req.body.id}`,
                            label: 'Join',
                            style: ButtonStyleTypes.PRIMARY
                        },
                        // Start button
                        {
                            type: MessageComponentTypes.BUTTON,
                            custom_id: `start_button_${req.body.id}`,
                            label: 'Start',
                            style: ButtonStyleTypes.SUCCESS
                        },
                        {
                            type: MessageComponentTypes.BUTTON,
                            custom_id: `bump_button_${req.body.id}`,
                            label: 'Bump message',
                            style: ButtonStyleTypes.SECONDARY
                        },
                    ]
                },
            ]
        },
    });
}

export function send_ephemeral_message(message: string, res: Response) {
    res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
            flags: InteractionResponseFlags.EPHEMERAL | InteractionResponseFlags.IS_COMPONENTS_V2,
            components: [
                {
                    type: MessageComponentTypes.TEXT_DISPLAY,
                    content: message
                }
            ]
        }
    });
}

export function send_already_joined_message(res: Response) {
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
}
