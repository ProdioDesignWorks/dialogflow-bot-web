module.exports = function(controller) {
  const path = require('path');
  // Add dialogflow middleware.
  const dialogflowMiddleware = require('botkit-middleware-dialogflow')({
    keyFilename: path.join('keys', 'teacher-bot.json'),
  });
  controller.middleware.receive.use(dialogflowMiddleware.receive);
};
