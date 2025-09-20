module.exports = function guildFind(id, ids) {
    let match = false;
    ids.forEach((guild) => {
      if (id == guild.id) {
        match = true;
      }
    });
    return match;
  };