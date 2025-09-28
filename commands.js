import { InstallGlobalCommands } from './utils.ts';

// Command to start a usurpers game
const USURPERS_COMMAND = {
  name: 'usurpers',
  description: 'Start new Usurpers Game',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

// Join an existing game
const JOIN = {
  name: 'join',
  description: 'Join an existing usurpers game.',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

// Show the list of players who have joined
const PLAYERS = {
  name: 'players',
  description: 'List players in game.',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

const ALL_COMMANDS = [USURPERS_COMMAND, JOIN, PLAYERS];
//const ALL_COMMANDS = [TEST_COMMAND, CHALLENGE_COMMAND, NEW_COMMAND, JOIN, ASSIGN, CHECK_ROLE, CLOSE];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);
