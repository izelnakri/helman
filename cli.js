#! /usr/bin/env node
import chalk from 'ansi-colors';

process.title = 'helman';

let shouldRunCommand = false;

const CLI = {
  async default(commandHandler) {
    if (!process.argv[2]) {
      shouldRunCommand = true;

      return await commandHandler();
    }
  },
  async command(commandName, commandHandler) {
    const commandMatchesArray = Array.isArray(commandName) && commandName.includes(process.argv[2]);

    if (commandMatchesArray || commandName === process.argv[2]) {
      shouldRunCommand = true;

      return await commandHandler();
    }
  },
};

(async () => {
  CLI.default(async () => await runCommand('./commands/index.js'));

  if (!shouldRunCommand) {
    console.log(chalk.red('helman unknown command. Available options are:'));

    await runCommand('./commands/index.js');

    setTimeout(() => process.exit(1), 100);
  }
})();

async function runCommand(commandPath) {
  return (await import(commandPath)).default();
}
