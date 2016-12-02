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

//t = Time Unit, in milliseconds
//is the value on which all timings in this app are based
var t = 1000;

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
    clearData: function() {
        localStorage['cohero-activity-log'] = '';
        localStorage['cohero-event-counts'] = '';
        console.log('Clearing data cache and reloading page...');
        setTimeout(window.location.reload.bind(window.location), 1000);
    },
    toggleRandomData: function() {
        if (socket._callbacks.$kioskEvent === undefined) {
            socket.on('kioskEvent', kioskEventHandler);
            console.log('Generating random events...');
        } else {
            socket.removeListener('kioskEvent');
            console.log('Stopping random events.');
        }
    },
    reloadPage: function() {
        console.log('Reloading page...');
        window.location.reload();
    },
    toggleActivityLog: function() {
        $('.cohero-activity-log-overlay:visible').animateCSS('zoomOut', {
            callback: function() {
                $(this).hide();
            }
        });
        $('.cohero-activity-log-overlay:hidden').animateCSS('zoomIn', {
            callback: function() {
                $(this).show();
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
    var coheroHub;
    var isConnected;
    try {
        coheroHub = $.hubConnection('http://35.163.78.124:11111/signalr/hubs');
        isConnected = true;
    } catch (err) {
        console.log('Cannot connect to Cohero Hub!');
        isConnected = false;
    }
    if (isConnected === true) {
        var proxy = coheroHub.createHubProxy('signalRHub');
        proxy.on('recieveMessage', kioskEventHandler);

        coheroHub.start().done(function() {
                console.log('Connected to Cohero Hub');
                // console.log('Hub Connection ID =', coheroHub.id);
            })
            .fail(function() {
                console.log('Could not connect to Cohero Hub!');
            });
    }

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

    var item = msg;

    if (item.eventType === "lungFunctionTest") {
        //let's round!
        item.eventDetails.pef = +((item.eventDetails.pef * 60).toFixed(0));
        item.eventDetails.fev1 = +((item.eventDetails.fev1).toFixed(2));
        item.eventDetails.fvc = +((item.eventDetails.fvc).toFixed(2));
    }

    addQueueItem(item);
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


    setTimeout(checkForQueuedItems, t * 1, type);

    console.log('Event Queued', type, item.eventId);
}

function removeQueueItem(id) {
    var $item = $('.cohero-queue-item[data-id="' + id + '"]');
    $item.addClass('cohero-queue-item-active');
    setTimeout(function() {
        $item.slideUp();
        setTimeout(function() {
            $item.remove();
        }, t * 1);
    }, t * 6);
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
            typeText = "Control puff";
        }
        if (type === "puffRescue") {
            typeText = "Rescue puff";
        }
        if (type === "lungFunctionTest") {
            typeText = "Spirometry test";
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
    }, t * 7);
}

function notifyLungFunctionTest(item) {
    inProgress.lungFunctionTest = true;
    var count = counts.lungFunctionTest;
    var gt1 = false;
    if (count > 1) {
        gt1 = true;
    }

    //let's round! -- moved earlier in the pipeline, since rounding is used everywhere
    // item.eventDetails.pef = +((item.eventDetails.pef * 60).toFixed(0));
    // item.eventDetails.fev1 = +((item.eventDetails.fev1).toFixed(2));
    // item.eventDetails.fvc = +((item.eventDetails.fvc).toFixed(2));

    var renderedHTML = Mustache.to_html(templates['cohero-notification-lungFunctionTest'], {
        item: item,
        count: count,
        gt1: gt1
    });
    var $notification = $('.cohero-notification-container-lungFunctionTest');
    $notification.html(renderedHTML).marquisLungFunctionTest();

    setTimeout(function() {
        inProgress.lungFunctionTest = false;
        checkForQueuedItems('lungFunctionTest');
    }, t * 9);
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
            setTimeout(checkForQueuedItems, t * 3, type);
        }
    }
}



$.fn.marquisPuffTaken = function() {
    var $container = $(this);
    $container.children().hide().eq(0).animateCSS('fadeInWobble', {
        duration: t * 2,
        callback: function() {
            $(this).animateCSS('fadeOutDown', {
                //delay: t * 1,
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
                    delay: t * 2,
                    callback: function() {
                        $(this).hide();
                    }
                });
            }
        });
    }, t * 3);
    setTimeout(function() {
        $container.children().eq(2).animateCSS('fadeInUp');
    }, t * 7);
    return this;
};

$.fn.marquisLungFunctionTest = function() {
    var $container = $(this);
    $container.children().hide().eq(0).animateCSS('fadeInWobble', {
        duration: t * 2,
        callback: function() {
            $(this).animateCSS('fadeOutDown', {
                //delay: t * 1,
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
                    delay: t * 2,
                    callback: function() {
                        $(this).hide();
                    }
                });
            }
        });
    }, t * 3);
    setTimeout(function() {
        $container.children().eq(2).animateCSS('fadeInUp');
    }, t * 7);
    return this;
};
