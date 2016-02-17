/* eslint-env browser */

(function() {
    'use strict';

    // Check to make sure service workers are supported in the current browser,
    // and that the current page is accessed from a secure origin. Using a
    // service worker from an insecure origin will trigger JS console errors. See
    // http://www.chromium.org/Home/chromium-security/prefer-secure-origins-for-powerful-new-features
    var isLocalhost = Boolean(window.location.hostname === 'localhost' ||
        // [::1] is the IPv6 localhost address.
        window.location.hostname === '[::1]' ||
        // 127.0.0.1/8 is considered localhost for IPv4.
        window.location.hostname.match(
            /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
        )
    );

    if ('serviceWorker' in navigator &&
        (window.location.protocol === 'https:' || isLocalhost)) {
        navigator.serviceWorker.register('service-worker.js')
            .then(function(registration) {
                // Check to see if there's an updated version of service-worker.js with
                // new files to cache:
                // https://slightlyoff.github.io/ServiceWorker/spec/service_worker/index.html#service-worker-registration-update-method
                if (typeof registration.update === 'function') {
                    registration.update();
                }

                // updatefound is fired if service-worker.js changes.
                registration.onupdatefound = function() {
                    // updatefound is also fired the very first time the SW is installed,
                    // and there's no need to prompt for a reload at that point.
                    // So check here to see if the page is already controlled,
                    // i.e. whether there's an existing service worker.
                    if (navigator.serviceWorker.controller) {
                        // The updatefound event implies that registration.installing is set:
                        // https://slightlyoff.github.io/ServiceWorker/spec/service_worker/index.html#service-worker-container-updatefound-event
                        var installingWorker = registration.installing;

                        installingWorker.onstatechange = function() {
                            switch (installingWorker.state) {
                                case 'installed':
                                    // At this point, the old content will have been purged and the
                                    // fresh content will have been added to the cache.
                                    // It's the perfect time to display a 'New content is
                                    // available; please refresh.' message in the page's interface.
                                    break;

                                case 'redundant':
                                    throw new Error('The installing ' +
                                        'service worker became redundant.');

                                default:
                                    // Ignore
                            }
                        };
                    }
                };
            }).catch(function(e) {
                console.error('Error during service worker registration:', e);
            });
    }

    // Your custom JavaScript goes here

    // var rss_tuoitre = 'http://tuoitre.vn/rss/tt-tin-moi-nhat.rss';
    // var rss_vnexpress = 'http://vnexpress.net/rss/tin-moi-nhat.rss';
    var rssReader = 'yql';

    function urlBuilder(type, url) {
        if (type === "rss") {
            if (rssReader === 'google') {
                return 'https://ajax.googleapis.com/ajax/services/feed/load?v=1.0&num=20&q=' + url;
            } else if (rssReader === 'yql') {
                return 'https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20rss%20where%20url%3D%22' + url + '%22&format=json';
            }
        } else {
            return url;
        }
    }

    var displayDiv = document.getElementById('mainContent');

    // Part 1 - Create a function that returns a promise
    function getJsonAsync(url) {
        // Promises require two functions: one for success, one for failure
        return new Promise(function(resolve, reject) {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url);
            xhr.onload = () => {
                if (xhr.readyState == 4 && xhr.status === 200) {
                    // We can resolve the promise
                    resolve(xhr.response);
                } else {
                    // It's a failure, so let's reject the promise
                    reject('Unable to load RSS');
                }
            }
            xhr.onerror = () => {
                // It's a failure, so let's reject the promise
                reject('Unable to load RSS');
            };
            xhr.send();
        });
    }

    function getNewsDetail(type, link, callback) {
        if (type === "json") {
            callback(news[link]);
            return;
        }

        // get news detail by using rest api which are created by import.io
        showLoading();
        var connector = 'e920a944-d799-4ed7-a017-322eb25ace70';
        if (link.indexOf('tuoitre.vn') > -1) {
            connector = 'bdf72c89-c94b-48f4-967b-b5bc3f8288f7';
        } else if (link.indexOf('vnexpress.net') > -1 || link.indexOf('gamethu.net') > -1) {
            connector = 'e920a944-d799-4ed7-a017-322eb25ace70';
        }

        $.ajax({
            url: 'https://api.import.io/store/connector/' + connector + '/_query',
            data: {
                input: 'webpage/url:' + link,
                _apikey: '59531d5e38004cbd944872b657c479fb6eb8a951555700c13023482aad713db52a65da670cd35dbe42a8fc32301bb78f419cba619c4c1c2e66ecde01de25b90dc014dece32953d8ad7c9de7ad788a261'
            },
            success: function(response) {
                callback(response.results[0]);
            },
            error: function(error) {
                showDialog({
                    title: 'Error',
                    text: error
                })
            },
            complete: function() {
                hideLoading();
            }
        });
    }

    var news = [];

    function loadNews(type, url) {
        showLoading();
        url = urlBuilder(type, url);
        var promise = $.ajax({
            url: url,
            // crossDomain: true,
            // dataType: "jsonp"
        });
        promise.done(function(response) {
            displayDiv.innerHTML = '';
            if (type === "rss") {
                if (rssReader === 'google') {
                    if (response.responseData.feed) {
                        news = response.responseData.feed.entries;
                    } else {
                        news = response.query.results.item;
                    }
                } else if (rssReader === 'yql') {
                    news = response.query.results.item;
                }
            } else if (type === "json") {
                news = response.results.results || response.results.items || response.results.collection1;
            }
            news.forEach(item => {
                displayDiv.innerHTML += getTemplateNews(item);
            });

            $('button.simple-ajax-popup').on('click', function(e) {
                e.preventDefault();
                var link = $(this).data('link');
                console.log(link);
                if (!link) {
                    showDialog({
                        title: 'no link',
                        text: link
                    })
                    return;
                }
                if (type === "json") {
                    link = $(this).parents('.news-item').index();
                };
                getNewsDetail(type, link, function(detail) {
                    var content_html = detail.content_html || detail.content;
                    var $content = $('<div>'+content_html+'</div');
                    $content.find('.nocontent').remove();
                    // var $content = $(content_html).siblings(".nocontent").remove();
                    showDialog({
                        title: detail.title,
                        text: $content.html()
                    })
                })
            });
        }).complete(function() {
            hideLoading();
        });
    }

    function getTemplateNews(news) {
        if (!news.content) {
            news.content = news.description || "";
        }
        news.content = news.content.replace(new RegExp('/s146/', 'g'), '/s440/');
        news.summary = news.summary || news.content;
        if (!news.image && news.summary.indexOf('<img ') === -1 && news.content.indexOf('<img ') > -1) {
            news.image = $(news.content).find('img:first-child').attr('src');
        }
        news.image = (news.image) ? `<img src="${news.image.replace(new RegExp('/s146/', 'g'), '/s440/')}" />` : '';

        news.time = news.time || news.publishedDate || news.pubDate || '';
        news.link = news.link || news.url;
        news.sourceText = news.source ? ' - ' + news.source.text : '';
        return `<div class='news-item mdl-color-text--grey-700 mdl-shadow--2dp'>
                    <div class='news-item__title'>
                        <div class='news-item__title-text mdl-typography--title'>
                           ${news.title}
                        </div>
                        <div class='news-item__title-time'>${news.time} <b>${news.sourceText}</b></div>
                    </div>
                    <div class='news-item__content'>
                        ${news.image}
                        ${news.summary}
                    </div>
                    <div class='news-item__actions'>
                        <button data-link='${news.link}' class='mdl-button mdl-button--colored mdl-js-button mdl-js-ripple-effect simple-ajax-popup'>
                          View more
                        </button>
                        <a href='${news.link}' target='_blank' class='mdl-button mdl-button--colored mdl-js-button mdl-js-ripple-effect simple-ajax-popup'>
                          Open web
                        </a>
                    </div>
                </div>`
    }

    $('.change-news').click(function(e) {
        loadNews($(this).data('type'), $(this).data('url'));
        $(".mdl-layout__obfuscator").click();
    });
    $('.change-news:first-child').click();

    // PLUGIN mdl-jquery-modal-dialog.js
    function showLoading() {
        // remove existing loaders
        $('.loading-container').remove();
        $('<div id="orrsLoader" class="loading-container"><div><div class="mdl-spinner mdl-js-spinner is-active"></div></div></div>').appendTo("body");

        componentHandler.upgradeElements($('.mdl-spinner').get());
        setTimeout(function() {
            $('#orrsLoader').css({
                opacity: 1
            });
        }, 1);
    }

    function hideLoading() {
        $('#orrsLoader').css({
            opacity: 0
        });
        setTimeout(function() {
            $('#orrsLoader').remove();
        }, 400);
    }

    function showDialog(options) {
        options = $.extend({
            id: 'orrsDiag',
            title: null,
            text: null,
            negative: false,
            positive: false,
            cancelable: true,
            contentStyle: null,
            onLoaded: false
        }, options);

        // remove existing dialogs
        $('.dialog-container').remove();
        $(document).unbind("keyup.dialog");

        $('<div id="' + options.id + '" class="dialog-container"><div class="mdl-card mdl-shadow--16dp"></div></div>').appendTo("body");
        var dialog = $('#orrsDiag');
        var content = dialog.find('.mdl-card');
        if (options.contentStyle != null) content.css(options.contentStyle);
        if (options.title != null) {
            $('<h5>' + options.title + '</h5>').appendTo(content);
        }
        if (options.text != null) {
            $('<p>' + options.text + '</p>').appendTo(content);
        }
        if (options.negative || options.positive) {
            var buttonBar = $('<div class="mdl-card__actions dialog-button-bar"></div>');
            if (options.negative) {
                options.negative = $.extend({
                    id: 'negative',
                    title: 'Cancel',
                    onClick: function() {
                        return false;
                    }
                }, options.negative);
                var negButton = $('<button class="mdl-button mdl-js-button mdl-js-ripple-effect" id="' + options.negative.id + '">' + options.negative.title + '</button>');
                negButton.click(function(e) {
                    e.preventDefault();
                    if (!options.negative.onClick(e))
                        hideDialog(dialog)
                });
                negButton.appendTo(buttonBar);
            }
            if (options.positive) {
                options.positive = $.extend({
                    id: 'positive',
                    title: 'OK',
                    onClick: function() {
                        return false;
                    }
                }, options.positive);
                var posButton = $('<button class="mdl-button mdl-button--colored mdl-js-button mdl-js-ripple-effect" id="' + options.positive.id + '">' + options.positive.title + '</button>');
                posButton.click(function(e) {
                    e.preventDefault();
                    if (!options.positive.onClick(e))
                        hideDialog(dialog)
                });
                posButton.appendTo(buttonBar);
            }
            buttonBar.appendTo(content);
        }
        componentHandler.upgradeDom();
        if (options.cancelable) {
            dialog.click(function() {
                hideDialog(dialog);
            });
            $(document).bind("keyup.dialog", function(e) {
                if (e.which == 27)
                    hideDialog(dialog);
            });
            content.click(function(e) {
                e.stopPropagation();
            });
        }
        setTimeout(function() {
            dialog.css({
                opacity: 1
            });
            if (options.onLoaded)
                options.onLoaded();
        }, 1);
    }

    function hideDialog(dialog) {
        $(document).unbind("keyup.dialog");
        dialog.css({
            opacity: 0
        });
        setTimeout(function() {
            dialog.remove();
        }, 400);
    }
})();
