var templates = {};

var counts = {
    "puffControl": 0,
    "puffRescue": 0,
    "lungFunctionTest": 0
};

var activityLog = [];

var data = {
    "puffControl": [],
    "puffRescue": [],
    "lungFunctionTest": []
};

var inProgress = {
    "puffControl": false,
    "puffRescue": false,
    "lungFunctionTest": false
};

var socket;

$(function() {

    testForChrome();

    loadTemplates();

    loadActivityLog();

    loadEventCounts();

    connectToSocket();

    connectToCoheroHub();

    handleRemoteEvents();

});

var admin = {
    clearAllData: function() {
        localStorage['cohero-activity-log'] = '';
        localStorage['cohero-event-counts'] = '';
        console.log('Clearing cache and reloading page.');
        setTimeout(window.location.reload.bind(window.location), 1000);
    },
    randomData: function() {
        console.log('Generating random events');
        socket.on('kioskEvent', kioskEventHandler);
    },
    reloadPage: function() {
        console.log('Reloading page...');
        window.location.reload();
    },
    stopRandomData: function() {
        console.log('Stopping random events...');
        socket.removeListener('kioskEvent');
    },
    toggleActivityLog: function() {
        $('.cohero-activity-log-overlay:hidden').animateCSS('zoomIn');
        $('.cohero-activity-log-overlay:visible').animateCSS('zoomOut', {
            callback: function() {
                $(this).hide();
            }
        });

    }

};

function testForChrome() {
    var chrome = /chrom(e|ium)/.test(navigator.userAgent.toLowerCase());
    if (!chrome) {
        alert('I am designed for use in Google Chrome & Chromium only.');
    }
}

function connectToSocket() {
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
    templates['cohero-notification-count'] = $('.template-cohero-notification-count').html();
}

function handleRemoteEvents() {
    socket.on('remoteEvent', remoteEventHandler);
}

function remoteEventHandler(msg) {
    console.log('Remote Event Recieved', msg);
    var directive = msg.directive;
    admin[directive]();
}

function kioskEventHandler(msg) {
    console.log('Event Recieved', msg.eventId);
    console.table(msg);
    addQueueItem(msg);
}

function determineEventType(item) {
    var type;
    if (item.eventType === "puffTaken") {
        var medicationType = item.eventDetails.medicationType;
        if (medicationType === "Control") {
            type = "puffControl";
        }
        if (medicationType === "Rescue") {
            type = "puffRescue";
        }
    }
    if (item.eventType === "lungFunctionTest") {
        type = "lungFunctionTest";
    }
    return type;
}

function addQueueItem(item) {
    var type = determineEventType(item);

    var renderedHTML = Mustache.to_html(templates['cohero-queue-item'], item);
    var $queue = $('.cohero-queue-' + type);
    $queue.append(renderedHTML);

    sendItemToActivityLog(item);
    
    item.queued = true;
    data[type].push(item);
    counts[type] += 1;
    cacheEventCounts();


    setTimeout(checkForQueuedItems, 1000, type);

    console.log('Event Queued', type, item.eventId);
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
    var type = determineEventType(item);

    if (type === 'puffControl' || type === 'puffRescue') {
        notifyPuffTaken(item, type);
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
    } else {
        console.log('No Cached Activity Found!');
    }
}

function loadEventCounts() {
    if (localStorage['cohero-event-counts']) {
        console.log('Cached Event Counts Found. Loading...');
        counts = JSON.parse(localStorage['cohero-event-counts']);
        renderEventCounts();
    } else {
        console.log('No Cached Event Counts Found!');
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

function renderEventCounts() {
    Object.keys(counts).forEach(function(key) {
        renderEventCount(key);
    });

    function renderEventCount(type) {
        var count = counts[type];
        var gt1 = false;
        if (count > 1) {
            gt1 = true;
        }
        var typeText;
        if (type === "puffControl") {
            typeText = "Control Puff";
        }
        if (type === "puffRescue") {
            typeText = "Rescue Puff";
        }
        if (type === "lungFunctionTest") {
            typeText = "Spirometry Test";
        }
        if (count > 0) {
            var renderedHTML = Mustache.to_html(templates['cohero-notification-count'], {
                count: count,
                gt1: gt1,
                typeText: typeText
            });
            var $notification = $('.cohero-notification-container-' + type);
            $notification.html(renderedHTML);
        }
    }
}

function sendItemToActivityLog(item) {
    console.log('Event Sent to Activity Log', item.eventId);

    if (item.eventType === "puffTaken") {
        item.eventLogDescripton = "eMDI Puff" + " " + item.eventDetails.medicationType;
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

function cacheActivityLog() {
    localStorage.setItem('cohero-activity-log', JSON.stringify(activityLog));
}

function cacheEventCounts() {
    localStorage.setItem('cohero-event-counts', JSON.stringify(counts));
    console.log('event counts cached');
}

function notifyPuffTaken(item, type) {
    inProgress[type] = true;
    //remove MCG units to save space
    item.eventDetails.medication = item.eventDetails.medication.replace(/ mcg/, '');
    var count = counts[type];
    var gt1 = false;
    if (count > 1) {
        gt1 = true;
    }
    var renderedHTML = Mustache.to_html(templates['cohero-notification-puffTaken'], {
        item: item,
        count: count,
        gt1: gt1
    });
    var $notification = $('.cohero-notification-container-' + type);
    $notification.html(renderedHTML).marquisPuffTaken();

    setTimeout(function() {
        inProgress[type] = false;
        checkForQueuedItems(type);
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
                //this is where we did this when the activityLog came AFTER the notification.
                //now it is in sync
                //sendItemToActivityLog(item);
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
        $container.children().eq(2).animateCSS('fadeInUp');
    }, 6000);
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
        $container.children().eq(2).animateCSS('fadeInUp');
    }, 6000);
    return this;
};
