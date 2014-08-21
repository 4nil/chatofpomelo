module.exports = function(app) {
	return new ChatRemote(app);
};

var ChatRemote = function(app) {
	this.app = app;
	this.channelService = app.get('channelService');
};

/**
 * Add user into chat channel.
 *
 * @param {String} uid unique id for user
 * @param {String} sid server id
 * @param {String} name channel name
 * @param {boolean} flag channel parameter
 *
 */
ChatRemote.prototype.add = function(uid, sid, name, flag, cb) {
	var channel = this.channelService.getChannel(name, flag);
	var uids = uid.split('*');
	var username = uids[0];
	var param = {
		route: 'welcome',
		user: username,
		id: parseInt(uids[2])
	};

	if( !! channel) {
		channel.add(uid, sid);
		this.channelService.pushMessageByUids(param, [{
			uid: uid,
			sid: sid
		}]);
	}

	cb(this.get(name, flag));
};

/**
 * Get user from chat channel.
 *
 * @param {Object} opts parameters for request
 * @param {String} name channel name
 * @param {boolean} flag channel parameter
 * @return {Array} users uids in channel
 *
 */
ChatRemote.prototype.get = function(name, flag) {
	var users = [];
	var channel = this.channelService.getChannel(name, flag);
	if( !! channel) {
		users = channel.getMembers();
	}
	for(var i = 0; i < users.length; i++) {
		users[i] = users[i].split('*')[0];
	}
	return users;
};

/**
 * Kick user out chat channel.
 *
 * @param {String} uid unique id for user
 * @param {String} sid server id
 * @param {String} name channel name
 *
 */
ChatRemote.prototype.kick = function(uid, sid, name, cb) {
	var channel = this.channelService.getChannel(name, false);
	var uids = uid.split('*');
	var username = uids[0];
	var param = {
		route: 'closed',
		user: username,
		id: parseInt(uids[2])
	};
	// leave channel
	if( !! channel) {
		channel.pushMessage(param);
		channel.leave(uid, sid);
	}
	cb();
};
