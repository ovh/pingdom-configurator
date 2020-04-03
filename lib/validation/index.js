const Joi = require('@hapi/joi');

/**
 * Validate global config
 */
function validateConfig(config) {
  const { error } = Joi.object().keys({
    dryRun: Joi.boolean(),
    soft: Joi.boolean(),
    apiToken: Joi.string(),
    filterTags: Joi.array().items(Joi.string().required()),
    filterRegex: Joi.string(),
    checksCommonConfig: Joi.object(),
    tmsChecksCommonConfig: Joi.object(),
    checks: Joi.array().items(Joi.object()).unique('name'),   // note: "name" must be uniq
    tmsChecks: Joi.array().items(Joi.object()).unique('name'), // note: "name" must be uniq
  }).required().validate(config);

  if (error) {
    throw new Error(error);
  }

  if (!config.checks && !config.tmsChecks) {
    throw new Error('Please provide checks and/or TMS checks in config!');
  }
}

/**
 * Validate checks config
 * @see https://docs.pingdom.com/api/#tag/Checks/paths/~1checks/post
 */
function validateChecksConfig(checks) {
  const commonAttributesSetModel = Joi.object().keys({
    name: Joi.string().required(),                                                                                 // (required) (string) Check name
    type: Joi.string().allow('http', 'httpcustom', 'tcp', 'ping', 'dns', 'udp', 'smtp', 'pop3', 'imap').required(), // (required) (string) Enum: "http" "httpcustom" "tcp" "ping" "dns" "udp" "smtp" "pop3" "imap" - Type of check
    host: Joi.string().hostname().required(),                                                                      // (required) (string) Target host
    ipv6: Joi.string().allow('true', 'false'),                                                                     // (booleanAsString) Default: false - Use ipv6 instead of ipv4, if an IP address is provided as host this will be overrided by the IP address version
    paused: Joi.string().allow('true', 'false'),                                                                   // (booleanAsString) Default: false
    tags: Joi.string().regex(/^(?:\w,?)+$/),                                                                       // (string) List of tags for check. Comma separed string.
    probe_filters: Joi.string().regex(/^(?:\w+:\w+,?)+$/),                                                         // (tring) Filters used for probe selections. Overwrites previous filters for check. To remove all filters from a check, use an empty value. Comma separated key:value pairs.
    resolution: Joi.number().integer().allow(1, 5, 15, 30, 60),                                                    // (integer) Default: 5 - Enum: 1 5 15 30 60 - How often should the check be tested? (minutes)
    responsetime_threshold: Joi.number().integer(),                                                                // (integer) Default: 30000 - Triggers a down alert if the response time exceeds threshold specified in ms (Not available for Starter and Free plans.)
    sendnotificationwhendown: Joi.number().integer(),                                                              // (integer) Default: 2 - Send notification when down X times
    notifyagainevery: Joi.number().integer(),                                                                      // (integer) Default: 0 - Notify again every n result. 0 means that no extra notifications will be sent.
    notifywhenbackup: Joi.string().allow('true', 'false'),                                                         // (booleanAsString) Default: true - Notify when back up again
    userids: Joi.string().regex(/^(?:\d,?)+$/),                                                                    // (string) User identifiers. For example userids=154325,465231,765871
    teamids: Joi.string().regex(/^(?:\d,?)+$/),                                                                    // (string) Teams to alert. Comma separated Integers.
    integrationids: Joi.string().regex(/^(?:\d,?)+$/),                                                             // (string) Integration identifiers. For example integrationids=11,22,33. Comma separated Integers.
    custom_message: Joi.string(),                                                                                  // (string) Custom message that will be added to email and webhook alerts.
  });

  const typesAttributesSetModel = {
    http: Joi.object().keys({
      auth: Joi.string().regex(/^\w+:\w+$/),                  // (string) Username and password colon separated for target SMTP authentication
      url: Joi.string().regex(/^\/.*/),                       // (string) Path to target on server
      encryption: Joi.string().allow('true', 'false'),        // (booleanAsString) Connection encryption
      port: Joi.number().integer(),                           // (integer) Target port
      shouldcontain: Joi.string(),                            // (string) Target site should contain this string. Note! This parameter cannot be used together with the parameter “shouldnotcontain”, use only one of them in your request.
      shouldnotcontain: Joi.string(),                         // (string) Target site should NOT contain this string. Note! This parameter cannot be used together with the parameter “shouldcontain”, use only one of them in your request.
      postdata: Joi.string(),                                 // (string) Data that should be posted to the web page, for example submission data for a sign-up or login form. The data needs to be formatted in the same way as a web browser would send it to the web server
      requestheaders: Joi.object(),                           // (object) Custom HTTP header. Entry value should match header name
      verify_certificate: Joi.string().allow('true', 'false'), // (booleanAsString) Default: true - Treat target site as down if an invalid/unverifiable certificate is found.
      ssl_down_days_before: Joi.number().integer(),           // (integer) Default: 0 - Treat the target site as down if a certificate expires within the given number of days.
    }),
    httpcustom: Joi.object().keys({
      url: Joi.string().regex(/^\/.*/).required(),            // (required) (string) Path to target on server
      encryption: Joi.string().allow('true', 'false'),        // (booleanAsString) Connection encryption
      port: Joi.number().integer(),                           // (integer) Target port
      additionalurls: Joi.string().uri(),                     // (string) Full URL (including hostname) to target additional XML file
      verify_certificate: Joi.string().allow('true', 'false'), // (booleanAsString) Default: true - Treat target site as down if an invalid/unverifiable certificate is found.
      ssl_down_days_before: Joi.number().integer(),           // (integer) Default: 0 - Treat the target site as down if a certificate expires within the given number of days.
    }),
    tcp: Joi.object().keys({
      port: Joi.number().integer().required(), // (required) (integer) Target port
      stringtosend: Joi.string(),             // (string) String to send
      stringtoexpect: Joi.string(),           // (string) String to expect in response
    }),
    dns: Joi.object().keys({
      nameserver: Joi.string().hostname().required(), // (required) (string) DNS server to use
      expectedip: Joi.string().ip().required(),      // (required) (string) Expected IP
    }),
    udp: Joi.object().keys({
      port: Joi.number().integer().required(), // (required) (integer) Target port
      stringtosend: Joi.string().required(),  // (required) (string) String to send
      stringtoexpect: Joi.string().required(), // (required) (string) String to expect in response
    }),
    smtp: Joi.object().keys({
      auth: Joi.string().regex(/^\w+:\w+$/),          // (string) Username and password colon separated for target SMTP authentication
      port: Joi.number().integer(),                   // (integer) Target port
      encryption: Joi.string().allow('true', 'false'), // (booleanAsString) Connection encryption
      stringtoexpect: Joi.string(),                   // (string) String to expect in response
    }),
    pop3: Joi.object().keys({
      port: Joi.number().integer(), // (integer) Target port
      stringtoexpect: Joi.string(), // (string) String to expect in response
    }),
    imap: Joi.object().keys({
      port: Joi.number().integer(), // (integer) Target port
      stringtoexpect: Joi.string(), // (string) String to expect in response
    }),
  };

  // Validates each check:
  for (const check of checks) {
    const { error } = commonAttributesSetModel.concat(typesAttributesSetModel[check.type]).validate(check);
    if (error) {
      throw new Error(error);
    }
  }
}

/**
 * Validate TMS checks config
 * @see https://docs.pingdom.com/api/#operation/addCheck
 */
function validateTmsChecksConfig(tmsChecks) {
  const tmsCheckModel = Joi.object().keys({
    name: Joi.string().required(),                                   // (required) (string) Name of the check
    contact_ids: Joi.array().items(Joi.number().integer()),          // (array of integer) Contacts to alert
    custom_message: Joi.string(),                                    // (string) Custom message that is part of the email and webhook alerts
    interval: Joi.number().integer().allow(5, 10, 20, 60, 720, 1440), // (integer) Default: 10 - TMS test intervals in minutes
    region: Joi.string().allow('us-east', 'us-west', 'eu', 'au'),    // (string) Name of the region where the check is executed
    send_notification_when_down: Joi.number().integer(),             // (integer) Default: 1 - Send notification when down X times
    severity_level: Joi.string().allow('high', 'low'),               // (string) Default: high - Check importance- how important are the alerts when the check fails
    steps: Joi.array().items(Joi.object().keys({                     // (array of object) steps to be executed as part of the check
      fn: Joi.string().required(),                                   // (string) Operation to be done
      args: Joi.object().required(),                                 // (object) Parameters for the operation The actual parameters required depend on the chosen operation
    })).required(),
    team_ids: Joi.array().items(Joi.number().integer()),             // (array of integer) Teams to alert
    tags: Joi.array().items(Joi.string().regex(/^\w+$/)),            // (string) List of tags for check.
  });

  // Validates each check:
  for (const tmsCheck of tmsChecks) {
    const { error } = tmsCheckModel.validate(tmsCheck);
    if (error) {
      throw new Error(error);
    }
  }
}

module.exports = {
  validateConfig,
  validateChecksConfig,
  validateTmsChecksConfig,
};
