const _ = require('lodash');
const Bluebird = require('bluebird');
const PingdomApi = require('./pingdom-api');

const PINGDOM_CONCURRENCY = 5;

module.exports = class Api {
  constructor(config) {
    this.config = config;
    this.pingdom = new PingdomApi(this.config);
    this.dryRun = this.config.get('dryRun', false);

    this.filterTags = this.config.get('filterTags');
    this.filterRegex = new RegExp(this.config.get('filterRegex') || '^.*$');
  }

  /** ----------------------------- CHECKS ----------------------------- * */

  /**
   * Get checks (ping) list.
   * @see https://docs.pingdom.com/api/#tag/Checks/paths/~1checks/get
   */
  async getChecks() {
    const response = await this.pingdom.get('checks', {
      tags: this.filterTags ? this.filterTags.join(',') : '',
      showencryption: true,
      include_tags: true,
      include_severity: true,
    });
    let data = response.body.checks || [];
    // filter the checks regarging the Regex from config:
    data = _.filter(data, (d) => this.filterRegex.test(d.name));
    // filter the checks il multiple tags, to have only checks with all the tags:
    if (this.filterTags) {
      data = _.filter(data, (d) => this.filterTags.every((tag) => _.map(d.tags, 'name').includes(tag)));
    }
    return data;
  }

  /**
   * Add a new check.
   * @see https://docs.pingdom.com/api/#tag/Checks/paths/~1checks/post
   */
  async addCheck(check) {
    if (this.dryRun) {
      return check;
    }
    const response = await this.pingdom.post('checks', check);
    return response.body;
  }

  /**
   * Update an existing check.
   * @see https://docs.pingdom.com/api/#tag/Checks/paths/~1checks~1{checkid}/put
   */
  async updateCheck(checkId, check) {
    if (this.dryRun) {
      return check;
    }
    const response = await this.pingdom.put(`checks/${checkId}`, _.assignIn({}, _.omit(check, ['type']), { paused: 'false' }));
    return response.body;
  }

  /**
   * Delete an existing check.
   * @see https://docs.pingdom.com/api/#tag/Checks/paths/~1checks/delete
   */
  async deleteChecks(checkIds) {
    if (this.dryRun) {
      return checkIds;
    }
    const response = await this.pingdom.delete('checks', {
      delcheckids: checkIds,
    });
    return response.body;
  }

  /**
   * Pause an existing check.
   * @see https://docs.pingdom.com/api/#tag/Checks/paths/~1checks/put
   */
  async pauseChecks(checkIds) {
    if (this.dryRun) {
      return checkIds;
    }
    const response = await this.pingdom.put('checks', {
      checkids: checkIds,
      paused: 'true',
    });
    return response.body;
  }

  /** --------------------------- TMS CHECKS --------------------------- * */

  /**
   * Get TMS checks (transactions) list.
   * @see https://docs.pingdom.com/api/#operation/getAllChecks
   */
  async getTmsChecks() {
    const response = await this.pingdom.get('tms/check', {
      tags: this.filterTags ? this.filterTags.join(',') : '',
    });
    let data = response.body.checks || [];
    // filter the checks regarging the Regex from config:
    data = _.filter(data, (d) => this.filterRegex.test(d.name));
    // filter the checks il multiple tags, to have only checks with all the tags:
    if (this.filterTags) {
      data = _.filter(data, (d) => this.filterTags.every((tag) => d.tags.includes(tag)));
    }
    return data;
  }

  /**
   * Add a new TMS check.
   * @see https://docs.pingdom.com/api/#operation/addCheck
   */
  async addTmsCheck(tmsCheck) {
    if (this.dryRun) {
      return tmsCheck;
    }
    const response = await this.pingdom.post('tms/check', tmsCheck);
    return response.body;
  }

  /**
   * Update an existing TMS check.
   * @see https://docs.pingdom.com/api/#operation/modifyCheck
   */
  async updateTmsCheck(tmsCheckId, tmsCheck) {
    if (this.dryRun) {
      return tmsCheck;
    }
    const response = await this.pingdom.put(`tms/check/${tmsCheckId}`, _.assignIn({}, tmsCheck, { active: true }));
    return response.body;
  }

  /**
   * Delete an existing TMS check.
   * @see https://docs.pingdom.com/api/#operation/deleteCheck
   */
  async deleteTmsChecks(tmsCheckIds) {
    if (this.dryRun) {
      return tmsCheckIds;
    }
    return await Bluebird.map(tmsCheckIds, async (tmsCheckId) => {
      const response = await this.pingdom.delete(`tms/check/${tmsCheckId}`);
      return response.body;
    }, { concurrency: PINGDOM_CONCURRENCY });
  }

  /**
   * Pause an existing TMS check.
   * @see https://docs.pingdom.com/api/#operation/modifyCheck
   */
  async pauseTmsChecks(tmsCheckIds) {
    if (this.dryRun) {
      return tmsCheckIds;
    }
    return await Bluebird.map(tmsCheckIds, async (tmsCheckId) => {
      const response = await this.pingdom.put(`tms/check/${tmsCheckId}`, {
        active: false,
      });
      return response.body;
    }, { concurrency: PINGDOM_CONCURRENCY });
  }
};
