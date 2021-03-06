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
  CLI.command(['new', 'init'], async () => await runCommand('./commands/init.js'));
  CLI.command(['install', 'i'], async () => await runCommand('./commands/install.js'));
  CLI.command(['uninstall', 'u'], async () => await runCommand('./commands/uninstall.js'));
  CLI.command(['build', 'b'], async () => await runCommand('./commands/build.js'));
  CLI.command(['outdated', 'o'], async () => await runCommand('./commands/outdated.js'));
  CLI.command(['config'], async () => await runCommand('./commands/config.js'));
  CLI.command(['analyze', 'a'], async () => await runCommand('./commands/analyze.js'));
  CLI.command(['diff', 'd'], async () => await runCommand('./commands/diff.js'));
  CLI.command(['help', 'h', 'print', 'p'], async () => await runCommand('./commands/index.js'));

  if (!shouldRunCommand) {
    console.log(chalk.red('helman unknown command. Available options are:'));

    await runCommand('./commands/index.js');

    setTimeout(() => process.exit(1), 100);
  }
})();

async function runCommand(commandPath) {
  return (await import(commandPath)).default();
}
