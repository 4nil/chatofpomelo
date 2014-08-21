var WebSocketService = function(model, webSocket) {
	var webSocketService = this;
	var model = model;
	
	this.hasConnection = false;

	var pomelo = webSocket;

	this.queryEntry = function(uid, callback) {
		var route = 'gate.gateHandler.queryEntry';
		pomelo.init({
			host: window.location.hostname,
			port: 3014,
			log: true
		}, function() {
			pomelo.request(route, {
				uid: uid
			}, function(data) {
				pomelo.disconnect();
				if(data.code === 500) {
					showError(LOGIN_ERROR);
					return;
				}
				callback(data.host, data.port);
			});
		});
	};
	
	this.welcomeHandler = function(data) {
		webSocketService.hasConnection = true;
		
		model.userTadpole.id = data.id;
		model.tadpoles[data.id] = model.tadpoles[-1];
		delete model.tadpoles[-1];
		
		//$('#chat').initChat();
		if($.cookie('todpole_name'))	{
			webSocketService.sendMessage('name:'+$.cookie('todpole_name'));
		}
		if($.cookie('sex')){
			model.userTadpole.sex = $.cookie('sex');
			if($.cookie('sex') == 1){
				$('#sex1').attr('checked','checked');
			}else if($.cookie('sex') == 0){
				$('#sex0').attr('checked','checked');
			}
			$.cookie('sex', model.userTadpole.sex, {expires:14});
		}
		if($.cookie('icon')){
			$('#icon').attr('src', $.cookie('icon'));
			model.userTadpole.icon = $.cookie('icon');
			$.cookie('icon', $.cookie('icon'), {expires:14});
		}

		webSocketService.sendUpdate(model.userTadpole);
	};
	pomelo.on('welcome', this.welcomeHandler);
	
	this.updateHandler = function(data) {
		var newtp = false;
		
		if(!model.tadpoles[data.id]) {
			newtp = true;
			model.tadpoles[data.id] = new Tadpole();
			model.arrows[data.id] = new Arrow(model.tadpoles[data.id], model.camera);
		}
		
		var tadpole = model.tadpoles[data.id];
		if(tadpole.id == model.userTadpole.id) {			
			return;
		} else {
			tadpole.name = data.name;
		}
		
		if("undefined" != typeof data.sex ){
			tadpole.sex = data.sex;
		}
		if("undefined" != typeof data.icon){
			tadpole.icon = data.icon;
		}
		
		if(newtp) {
			tadpole.x = parseFloat(data.x);
			tadpole.y = parseFloat(data.y);
		} else {
			tadpole.targetX = parseFloat(data.x);
			tadpole.targetY = parseFloat(data.y);
		}
		
		tadpole.angle = parseFloat(data.angle);
		tadpole.momentum = parseFloat(data.momentum);
		
		tadpole.timeSinceLastServerUpdate = 0;
	}
	pomelo.on('update', this.updateHandler);
	
	this.messageHandler = function(data) {
		var tadpole = model.tadpoles[data.id];
		if(!tadpole) {
			return;
		}
		tadpole.timeSinceLastServerUpdate = 0;
		tadpole.messages.push(new Message(data.msg));
		model.messages.push(new Message(tadpole.name+":"+data.msg))
	}
	pomelo.on('message', this.messageHandler);
	
	this.closedHandler = function(data) {
		if(model.tadpoles[data.id]) {
			delete model.tadpoles[data.id];
			delete model.arrows[data.id];
		}
	}
	pomelo.on('closed', this.closedHandler);
	
	this.redirectHandler = function(data) {
		if (data.url) {
			if (authWindow) {
				authWindow.document.location = data.url;
			} else {
				document.location = data.url;
			}			
		}
	}
	pomelo.on('redirect', this.redirectHandler);
	
	this.processMessage = function(data) {
		var fn = webSocketService[data.type + 'Handler'];
		if (fn) {
			fn(data);
		}
	}
	
	this.connectionClosed = function() {
		webSocketService.hasConnection = false;
		$('#cant-connect').fadeIn(300);
	};
	
	this.sendUpdate = function(tadpole) {
		var sendObj = {
			type: 'update',
			x: tadpole.x.toFixed(1),
			y: tadpole.y.toFixed(1),
			angle: tadpole.angle.toFixed(3),
			momentum: tadpole.momentum.toFixed(3),
			sex: tadpole.sex,
			icon: tadpole.icon
		};
		
		if(tadpole.name) {
			sendObj['name'] = tadpole.name;
		}else{
			sendObj['name'] = username;
		}
		
		pomelo.request('chat.chatHandler.update', sendObj, null);
	}
	
	this.sendMessage = function(msg) {
		var regexp = /name: ?(.+)/i;
		if(regexp.test(msg)) {
			model.userTadpole.name = msg.match(regexp)[1];
			$('#nick').val(model.userTadpole.name);
			$.cookie('todpole_name', model.userTadpole.name, {expires:14});
			return;
		}
		
		var sendObj = {
			type: 'message',
			msg: msg,
			target: '*',
			from: model.userTadpole.name
		};
		
		pomelo.request('chat.chatHandler.message', sendObj, null);
	}
	
	this.authorize = function(token,verifier) {
		var sendObj = {
			type: 'authorize',
			token: token,
			verifier: verifier
		};
		
		pomelo.request('chat.chatHandler.authorize', sendObj, function(data){

		});
	}

	var username = '访客'+(new Date().getTime());
	model.userTadpole.name = username;
	this.queryEntry(username, function(host, port) {
		pomelo.init({
			host: host,
			port: port,
			log: true
		}, function() {
			var route = "connector.entryHandler.enter";
			pomelo.request(route, {
				username: username,
				rid: 'public'
			}, function(data) {
				webSocketService.hasConnection = true;
			});
		});
	});
};
