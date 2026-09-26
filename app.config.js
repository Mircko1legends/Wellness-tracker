// Every CI build gets a higher versionCode so Android always accepts it as an update.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    versionCode: Number(process.env.GITHUB_RUN_NUMBER || 1),
  },
});
