import { InstallGlobalCommands } from './utils.js';

// Command to start a usurpers game
const USURPERS_COMMAND = {
  name: 'usurpers',
  description: 'Start new Usurpers Game',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

const ALL_COMMANDS = [USURPERS_COMMAND];
//const ALL_COMMANDS = [TEST_COMMAND, CHALLENGE_COMMAND, NEW_COMMAND, JOIN, ASSIGN, CHECK_ROLE, CLOSE];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);
