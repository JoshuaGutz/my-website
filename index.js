/*
*/
function openInSameWindow() {
    window.location.href = 
        'https://www.twitch.tv/popout/deemonrider/extensions/pm0qkv9g4h87t5y6lg329oam8j7ze9/panel';
}

function openInNewTab(url) {
    window.open(
        url, 
        '_blank');
}

function openExtensionWindow() {
    window.open(
        'https://www.twitch.tv/popout/deemonrider/extensions/pm0qkv9g4h87t5y6lg329oam8j7ze9/panel', 
        'ExtensionWindow', 
        'width=300,height=702,menubar=no,toolbar=no,location=no,status=no,scrollbars=no,resizable=yes'
    );
}

function openNewExtensionWindow() {
    window.open(
        'https://www.twitch.tv/popout/deemonrider/extensions/pm0qkv9g4h87t5y6lg329oam8j7ze9/panel', 
        '', 
        'width=300,height=702,menubar=no,toolbar=no,location=no,status=no,scrollbars=no,resizable=yes'
    );
}
