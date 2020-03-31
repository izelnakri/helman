import chalk from 'ansi-colors';

export function error(errorText, shouldExit = true) {
  console.log(`${chalk.cyan.bold('helman')} ${chalk.red(errorText)}`);

  if (shouldExit) {
    process.exit(1);
  }
}

export default { error };
