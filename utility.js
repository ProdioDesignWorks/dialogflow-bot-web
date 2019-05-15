const nodeCache = require('node-cache');
const cache = new nodeCache();
// to change state.
module.exports.changeState = async (state, user) => {
  const userData = await cache.get(user);
  await cache.set(user, {
    ...userData,
    state,
  });
};

// return current state
module.exports.getState = async user => {
  const userData = await cache.get(user);
  return userData && userData.state;
};

// get all the cached user data
module.exports.getUser = async user => {
  const userData = await cache.get(user);
  return userData;
};

module.exports.saveData = async (message, data) => {
  const userData = await cache.get(message.user);
  await cache.set(message.user, { ...userData, ...data });
};

module.exports.getData = async (message, key) => {
  const userData = await cache.get(message.user);
  return userData && userData[key];
};
