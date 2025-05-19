/*
*/
const backend_url = "https://poketwitch.bframework.de/"

function str_pad_left(string, pad, length) {
    return (new Array(length + 1).join(pad) + string).slice(-length);
}

function mainloop() {
    fetch(backend_url + 'info/events/last_spawn/').then(function (response) {
        return response.json();
    }).then(function (data) {
            var next_spawn = data.next_spawn

            function cooldown_wait() {
                next_spawn -= 1;

                var minutes = Math.floor(next_spawn / 60);
                var seconds = next_spawn - minutes * 60;

                document.getElementById('countdown').innerHTML = str_pad_left(minutes, '0', 2) + ":" + str_pad_left(seconds, '0', 2)
                console.log(next_spawn)
                if (next_spawn === 20) {
                    setTimeout(function () {
                        mainloop();
                    }, 2000);
                } else if (next_spawn > 0) {
                    setTimeout(function () {
                        cooldown_wait();
                    }, 999); /* reduced 1000ms to 999ms to account for drift*/
                } else {
                    setTimeout(function () {
                        mainloop();
                    }, 2000);
                }
            }

            cooldown_wait();
        }
    )
}

mainloop();
