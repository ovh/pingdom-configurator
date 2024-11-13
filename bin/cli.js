#!/usr/bin/env node

const commander = require('commander');
const Logger = require('../lib/utils/logger');
const Config = require('../lib/utils/config');
const PingdomConfigurator = require('../lib');

const logger = new Logger();

// Load config
async function getConfig(configurationFile) {
  const config = new Config();
  try {
    await config.load(configurationFile);
  } catch (e) {
    logger.error(e);
    process.exit(1);
  }
  return config;
}

// Main function
(async () => {
  const program = new commander.Command();

  program
    .requiredOption('--config <config>', 'The location of your config file.')
    .option('--dry-run', 'Dry Run mode', false)
    .option('--soft', 'Soft mode. Will not delete checks, but pause them', false)
    .description('Pingdom Configurator')
    .parse(process.argv);

  try {
    const config = await getConfig(program.config);
    config.set('dryRun', program.dryRun);
    config.set('soft', program.soft);
    const pingdomConfigurator = new PingdomConfigurator(config);
    await pingdomConfigurator.run();
  } catch (e) {
    logger.error(e);
    process.exit(1);
  }
})();
