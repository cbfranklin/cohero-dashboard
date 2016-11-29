var templates = {};

var counts = {
    "puffTaken": 0,
    "lungFunctionTest": 0
};

var activityLog = [];

var data = {
    "puffTaken": [],
    "lungFunctionTest": []
};

var inProgress = {
    "puffTaken": false,
    "lungFunctionTest": false
};

var socket;




$(function() {

    testForChrome();

    loadTemplates();

    loadActivityLog();

    connectToSocket();

    connectToCoheroHub();

});

function testForChrome() {
    var chrome = /chrom(e|ium)/.test(navigator.userAgent.toLowerCase());
    if (!chrome) {
        alert('I am designed for use in Google Chrome & Chromium only.');
    }
}

function connectToSocket(){
    socket = io();
    console.log('Connected to Socket.io');
}

function connectToCoheroHub() {

    /* using cohero servers */
    var coheroHub = $.hubConnection('http://35.163.78.124:11111/signalr/hubs');

    var proxy = coheroHub.createHubProxy('signalRHub');
    proxy.on('recieveMessage', kioskEventHandler);

    coheroHub.start().done(function() {
            console.log('Connected to Cohero Hub');
            console.log('Connection ID=' + coheroHub.id);
        })
        .fail(function() {
            console.log('Could not connect');
        });
}

function loadTemplates() {
    templates['cohero-queue-item'] = $('.template-cohero-queue-item').html();
    templates['cohero-notification-puffTaken'] = $('.template-cohero-notification-puffTaken').html();
    templates['cohero-notification-lungFunctionTest'] = $('.template-cohero-notification-lungFunctionTest').html();
    templates['cohero-activity-log-item'] = $('.template-cohero-activity-log-item').html();
}

function randomData(){

    console.log('Using nodejs random event generator via socket.io');

    socket.on('kioskEvent', kioskEventHandler);

}

function kioskEventHandler(msg) {
    console.log('Event Recieved', msg.eventId);
    console.table(msg);
    addQueueItem(msg);
}

function addQueueItem(item) {
    var type = item.eventType;
    var renderedHTML = Mustache.to_html(templates['cohero-queue-item'], item);
    var $queue = $('.cohero-queue-' + type);
    $queue.append(renderedHTML);

    item.queued = true;
    data[type].push(item);
    counts[type] += 1;

    setTimeout(checkForQueuedItems, 1000, type);

    console.log('Event Queued', item.eventId);
}

function removeQueueItem(id) {
    var $item = $('.cohero-queue-item[data-id="' + id + '"]');
    $item.addClass('cohero-queue-item-active');
    setTimeout(function() {
        $item.slideUp();
        setTimeout(function() {
            $item.remove();
        }, 1000);
    }, 5000);
}

function notifyQueuedItem(item) {
    var type = item.eventType;

    if (type === 'puffTaken') {
        notifyPuffTaken(item);
    }
    if (type === 'lungFunctionTest') {
        notifyLungFunctionTest(item);
    }
}

function loadActivityLog() {
    if (localStorage['cohero-activity-log']) {
        console.log('Cached Activity Found. Loading...');
        activityLog = JSON.parse(localStorage['cohero-activity-log']);
        renderActivityLog(activityLog);
    }
    else{
        console.log('No Cached Activity Found');
    }
}

function renderActivityLog(log) {
    //reverse reverse!
    log = log.reverse();
    var renderedHTML = Mustache.to_html(templates['cohero-activity-log-item'], {
        item: log
    });

    //render to DOM
    $('.cohero-activity-log tbody').append(renderedHTML);
}

function sendItemToActivityLog(item) {
    console.log('Event Sent to Activity Log', item.eventId);

    if (item.eventType === "puffTaken") {
        item.eventLogDescripton = "eMDI Puff";
    }
    if (item.eventType === "lungFunctionTest") {
        item.eventLogDescripton = "Spirometry";
    }

    var renderedHTML = Mustache.to_html(templates['cohero-activity-log-item'], {
        item: item
    });

    //render to DOM
    $('.cohero-activity-log tbody').prepend(renderedHTML);
    //push to log to be cached
    activityLog.push(item);
    //cache to localStorage
    cacheActivityLog();
}

function cacheActivityLog(){
    localStorage.setItem('cohero-activity-log', JSON.stringify(activityLog));
}

function notifyPuffTaken(item) {
    inProgress.puffTaken = true;
    //remove MCG units to save space
    item.eventDetails.medication = item.eventDetails.medication.replace(/ mcg/, '');
    var count = counts.puffTaken;
    var gt1 = false;
    if (count > 1) {
        gt1 = true;
    }
    var renderedHTML = Mustache.to_html(templates['cohero-notification-puffTaken'], {
        item: item,
        count: count,
        gt1: gt1
    });
    var $notification = $('.cohero-notification-container-puffTaken');
    $notification.html(renderedHTML).marquisPuffTaken();

    setTimeout(function() {
        inProgress.puffTaken = false;
        checkForQueuedItems('puffTaken');
    }, 6000);
}

function notifyLungFunctionTest(item) {
    inProgress.lungFunctionTest = true;
    var count = counts.lungFunctionTest;
    var gt1 = false;
    if (count > 1) {
        gt1 = true;
    }
    //let's round!
    item.eventDetails.pef = +((item.eventDetails.pef * 60).toFixed(0));
    item.eventDetails.fev1 = +((item.eventDetails.fev1).toFixed(2));
    item.eventDetails.fvc = +((item.eventDetails.fvc).toFixed(2));
    var renderedHTML = Mustache.to_html(templates['cohero-notification-lungFunctionTest'], {
        item: item,
        count: count
    });
    var $notification = $('.cohero-notification-container-lungFunctionTest');
    $notification.html(renderedHTML).marquisLungFunctionTest();

    setTimeout(function() {
        inProgress.lungFunctionTest = false;
        checkForQueuedItems('lungFunctionTest');
    }, 9000);
}

function checkForQueuedItems(type) {
    if (inProgress[type] === false) {
        var found = false;
        var dataOfType = data[type];

        for (var i in dataOfType) {
            if (dataOfType[i].queued === true) {
                var item = dataOfType[i];
                item.queued = false;
                notifyQueuedItem(item);
                sendItemToActivityLog(item);
                removeQueueItem(item.eventId);
                found = true;
                break;
            }
        }

        if (found) {
            setTimeout(checkForQueuedItems, 3000, type);
        }
    }
}



$.fn.marquisPuffTaken = function() {
    var $container = $(this);
    $container.children().hide().eq(0).animateCSS('fadeInWobble', {
        callback: function() {
            $(this).animateCSS('fadeOutDown', {
                delay: 1000,
                callback: function() {
                    $(this).hide();
                }
            });
        }
    });
    setTimeout(function() {
        $container.children().eq(1).animateCSS('fadeInDown', {
            /*callback: function() {
                $(this).animateCSS('fadeOutUp', {
                    delay: 1000,
                    callback: function() {
                        //$(this).hide();
                    }
                });
            }*/
        });
    }, 3000);
    /*setTimeout(function() {
        $container.children().eq(0).animateCSS('fadeInUp'
            , {
                        callback: function() {
                            $(this).animateCSS('fadeOut', {
                                delay: 1000,
                                callback: function() {
                                    $(this).hide();
                                }
                            });
                        }
                    }
        );
    }, 6000);*/
    return this;
};

$.fn.marquisLungFunctionTest = function() {
    var $container = $(this);
    $container.children().hide().eq(0).animateCSS('fadeInWobble', {
        callback: function() {
            $(this).animateCSS('fadeOutDown', {
                delay: 1000,
                callback: function() {
                    $(this).hide();
                }
            });
        }
    });
    setTimeout(function() {
        $container.children().eq(1).animateCSS('fadeInDown', {
            callback: function() {
                $(this).animateCSS('fadeOutUp', {
                    delay: 1000,
                    callback: function() {
                        $(this).hide();
                    }
                });
            }
        });
    }, 3000);
    setTimeout(function() {
        $container.children().eq(2).animateCSS('fadeInUp'
            /*, {
                        callback: function() {
                            $(this).animateCSS('fadeOut', {
                                delay: 1000,
                                callback: function() {
                                    $(this).hide();
                                }
                            });
                        }
                    }*/
        );
    }, 6000);
    setTimeout(function() {
        $container.children().eq(2).animateCSS('fadeInUp'
            /*, {
                        callback: function() {
                            $(this).animateCSS('fadeOutUp', {
                                delay: 1000,
                                callback: function() {
                                    $(this).hide();
                                }
                            });
                        }
                    }*/
        );
    }, 9000);
    return this;
};
