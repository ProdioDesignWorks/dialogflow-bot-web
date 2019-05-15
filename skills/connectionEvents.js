/* This module kicks in if no Botkit Studio token has been provided */

module.exports = function(controller) {
  controller.on('hello', conductOnboarding);
  controller.on('welcome_back', conductOnboarding);
  const { changeState } = require('../utility');
  const { teachers } = require('../chatflow');

  function conductOnboarding(bot, message) {
    const execScript = (state, convoVars) =>
      new Promise(resolve => {
        controller.studio
          .get(bot, state, message.user, message.event)
          .then(convo => {
            convoVars &&
              Object.keys(convoVars).forEach(key =>
                convo.setVar(key, convoVars[key])
              );
            convo.on('end', convo => {
              if (convo.status === 'completed') {
                const responses = convo.extractResponses();
                resolve(responses);
              }
            });
            convo.activate();
          });
      });
    controller.studio
      .run(bot, 'greeting', message.user, message.event)
      .then(convo => {
        convo.on('end', async () => {
          const res = await execScript('teacher_greeting');
          // if (res.teacher_register === 'Yes') {
          await execScript('location_question');
          await changeState(teachers[0], message.user);
          // } else {
          //   bot.reply(message, 'Ok Thank you');
          // }
        });
      });
  }
};
