const _ = require('lodash');
const Bluebird = require('bluebird');
const Table = require('cli-table3');
const Logger = require('./utils/logger');
const { validateConfig, validateChecksConfig, validateTmsChecksConfig } = require('./validation');
const Api = require('./api');

const PINGDOM_CONCURRENCY = 5;

module.exports = class PingdomConfigurator {
  constructor(config) {
    this.config = config;
    this.logger = new Logger();
    this.api = new Api(this.config);

    // Validate main config
    validateConfig(this.config.get());
  }

  /**
   * Displays a resume of changes.
   */
  async displayReport({
    type, added, updated, deleted,
  }) {
    const resultsTable = new Table({
      head: ['Type', 'Status', 'Name'],
    });
    _.forEach(added, (check) => {
      resultsTable.push([type, 'ADDED', check.name]);
    });
    _.forEach(updated, (check) => {
      resultsTable.push([type, 'UPDATED', check.name]);
    });
    _.forEach(deleted, (check) => {
      resultsTable.push([type, (this.config.get('soft') ? 'PAUSED' : 'DELETED'), check.name]);
    });

    this.logger.info(`--- Results ---\n${this.config.get('dryRun') ? '--------- DRY-RUN MODE ---------\n' : ''}${resultsTable.toString()}`);
  }

  /**
   * Add/Edit/Remove Pingdom checks, based on configuration.
   */
  async runChecksConfiguration() {
    // Get the checks in config (and extends them with the common config)
    const checksInConfig = _.map(this.config.get('checks'), (check) => _.assignIn({}, this.config.get('checksCommonConfig', {}), check));

    // Validate checks config
    validateChecksConfig(this.config.get(), checksInConfig);

    // Get the checks in Pingdom
    const checksInPingdom = await this.api.getChecks();

    // **ADD/UPDATE**
    const checksInPingdomAdded = [];
    const checksInPingdomUpdated = [];
    await Bluebird.map(checksInConfig, async (checkInConfig) => {
      const checkExistsAlready = _.find(checksInPingdom, { name: checkInConfig.name });

      if (checkExistsAlready) {
        // If exists already, update it
        await this.api.updateCheck(checkExistsAlready.id, checkInConfig);
        checksInPingdomUpdated.push(checkInConfig);
      } else {
        // else, create it
        await this.api.addCheck(checkInConfig);
        checksInPingdomAdded.push(checkInConfig);
      }
    }, { concurrency: PINGDOM_CONCURRENCY });

    // **DELETE**
    const checksInPingdomToDelete = _.filter(checksInPingdom, (checkInConfig) => !_.find(checksInConfig, { name: checkInConfig.name }));
    if (checksInPingdomToDelete.length) {
      // if soft mode, pause them, otherwise delete them
      if (this.config.get('soft')) {
        await this.api.pauseChecks(_.map(checksInPingdomToDelete, 'id').join(','));
      } else {
        await this.api.deleteChecks(_.map(checksInPingdomToDelete, 'id').join(','));
      }
    }

    // Report
    await this.displayReport({
      type: 'CHECK', added: checksInPingdomAdded, updated: checksInPingdomUpdated, deleted: checksInPingdomToDelete,
    });
  }

  /**
   * Add/Edit/Remove Pingdom TMS checks (transactions), based on configuration.
   */
  async runTmsChecksConfiguration() {
    // Get the TMS checks in config (and extends them with the common config)
    const tmsChecksInConfig = _.map(this.config.get('tmsChecks'), (check) => _.assignIn({}, this.config.get('tmsChecksCommonConfig', {}), check));

    // Validate checks config
    validateTmsChecksConfig(this.config.get(), tmsChecksInConfig);

    // Get the checks in Pingdom
    const tmsChecksInPingdom = await this.api.getTmsChecks();

    // **ADD/UPDATE**
    const tmsChecksInPingdomAdded = [];
    const tmsChecksInPingdomUpdated = [];
    await Bluebird.map(tmsChecksInConfig, async (tmsCheckInConfig) => {
      // eslint-disable-next-line no-param-reassign
      tmsCheckInConfig.integration_ids = _.map(tmsCheckInConfig.integration_ids, (iid) => parseInt(iid, 10));    // fix to be sure that integration_ids is an integer (because tags checks are string...)
      const checkExistsAlready = _.find(tmsChecksInPingdom, { name: tmsCheckInConfig.name });

      if (checkExistsAlready) {
        // If exists already, update it
        await this.api.updateTmsCheck(checkExistsAlready.id, tmsCheckInConfig);
        tmsChecksInPingdomUpdated.push(tmsCheckInConfig);
      } else {
        // else, create it
        await this.api.addTmsCheck(tmsCheckInConfig);
        tmsChecksInPingdomAdded.push(tmsCheckInConfig);
      }
    }, { concurrency: PINGDOM_CONCURRENCY });

    // **DELETE**
    const tmsChecksInPingdomToDelete = _.filter(tmsChecksInPingdom, (tmsCheckInConfig) => !_.find(tmsChecksInConfig, { name: tmsCheckInConfig.name }));
    if (tmsChecksInPingdomToDelete.length) {
      // if soft mode, pause them, otherwise delete them
      if (this.config.get('soft')) {
        await this.api.pauseTmsChecks(_.map(tmsChecksInPingdomToDelete, 'id'));
      } else {
        await this.api.deleteTmsChecks(_.map(tmsChecksInPingdomToDelete, 'id'));
      }
    }

    // Report
    await this.displayReport({
      type: 'TMS', added: tmsChecksInPingdomAdded, updated: tmsChecksInPingdomUpdated, deleted: tmsChecksInPingdomToDelete,
    });
  }

  /**
   * Main entry point.
   */
  async run() {
    if (this.config.get('checks')) {
      await this.runChecksConfiguration();
    }
    if (this.config.get('tmsChecks')) {
      await this.runTmsChecksConfiguration();
    }
  }
};
