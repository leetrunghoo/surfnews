export function getTemplateNews(item) {
    var {
        title, description, pubDate, link
    } = item;
    return `<div class="mdl-cell mdl-cell--3-col mdl-cell--4-col-tablet mdl-cell--4-col-phone">
                    <div class="mdl-card mdl-shadow--2dp">
                        <div class="mdl-card__title mdl-card--expand">
                            <h2 class="mdl-card__title-text">${title}</h2>
                        </div>
                        <div class="mdl-card__supporting-text">
                            ${pubDate}
                        </div>
                        <div class="mdl-card__supporting-text">
                            ${description}
                        </div>
                        <div class="mdl-card__actions mdl-card--border">
                            <a href="${link}" class="mdl-button mdl-button--colored mdl-js-button mdl-js-ripple-effect">
                          View more
                        </a>
                        </div>
                    </div>
                </div>`
}
