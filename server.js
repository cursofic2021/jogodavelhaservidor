// server.js
const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8765 });

class JogoDaVelhaServidor {
    constructor() {
        this.jogadores = [];
        this.tabuleiro = [['', '', ''], ['', '', ''], ['', '', '']];
        this.jogadorAtual = 'X';
        this.jogoAtivo = false;
        this.placar = { X: 0, O: 0, empates: 0 };
        this.tipo = ''; //tipo da mensagem () MARK, INVALID, OK, BOARD, WIN, DRAW, QUIT,BYE
        this.jogador = '' //jogador que irá fazer a jogada
        this.proximoJogador = ''//indica qual sera o proximo jogador
        this.status = '' //status do jogo 
        this.mensagem = '';
        /*posição para a jogada. (linha,coluna)
            . MARK <linha> <coluna> – faz uma jogada (0, 2) (0, 2).
            2. INVALID – jogada inválida (posição ocupada ou fora do tabuleiro ou enviada na    jogada na vez do outro jogador).
        3. OK – Jogada aceita.
        4. BOARD <estado> – Envia o estado do tabuleiro como string de 9 caracteres (X, O ou -).
        5. WIN <simbolo> – Anuncia vitória.
        6. DRAW – Anuncia empate.
        7. QUIT – Jogador desistiu.
        8. BYE – Finalização normal
        9 - INICIAL - estado preparando para receber novo jogador 'x'
        10 - INICIAL2 -  estado inicial para receber no vo jogador 'O' 
        11 - NOVO - indicando novo jogo entre dois jogadores
        */
    }
    //função já modificada, adicionando o jogador.
    adicionarJogador(ws) {
        this.jogadores.push(ws);

        if (this.jogadores.length === 1) {
            // Primeiro jogador (X)
            ws.send(JSON.stringify({
                tipo: 'INICIAL',
                tabuleiro: this.tabuleiro,
                status: 'Aguardando segundo jogador...',
                jogadorAtual: this.jogadorAtual,
                jogoAtivo: this.jogoAtivo,
                jogador: 'X'
            }));
        } else if (this.jogadores.length === 2) {
            this.jogoAtivo = true;

            // Primeiro jogador (X)
            this.jogadores[0].send(JSON.stringify({
                tipo: 'INICIAL2',
                tabuleiro: this.tabuleiro,
                status: 'Jogo iniciado! Sua vez (X)',
                jogadorAtual: this.jogadorAtual,
                jogoAtivo: this.jogoAtivo,
                jogador: 'X'
            }));

            // Segundo jogador (O)
            this.jogadores[1].send(JSON.stringify({
                tipo: 'INICIAL2',
                tabuleiro: this.tabuleiro,
                status: 'Jogo iniciado! Aguardando jogador X',
                jogadorAtual: this.jogadorAtual,
                jogoAtivo: this.jogoAtivo,
                jogador: 'O'
            }));
        }
    }

    //versão modificada - remover jogador passado parâmetro
    removerJogador(ws) {
        const index = this.jogadores.indexOf(ws);
        if (index > -1) {
            this.jogadores.splice(index, 1);
            console.log(`Jogador removido. Total de jogadores: ${this.jogadores.length}`);
        }

        // Se um jogador sair, reinicie o jogo
        if (this.jogadores.length < 2) {
            this.reiniciarNovoJogo();
            this.jogoAtivo = false;

            // Notificar jogador restante
            if (this.jogadores.length === 1) {
                this.jogadores[0].send(JSON.stringify({
                    tipo: 'BYE',
                    mensagem: 'O outro jogador desconectou. Aguardando novo oponente...',
                    tabuleiro: this.tabuleiro,
                    placar: this.placar
                }));
            }
        }
    }
    // Método para desistência
    processarDesistencia(ws) {
        const jogadorIndex = this.jogadores.indexOf(ws);
        const jogadorSimbolo = jogadorIndex === 0 ? 'X' : 'O';

        this.placar[jogadorSimbolo === 'X' ? 'O' : 'X']++;

        this.enviarParaTodos({
            tipo: 'WIN',
            tabuleiro: this.tabuleiro,
            mensagem: `Jogador ${jogadorSimbolo} desistiu! Vitória do jogador ${jogadorSimbolo === 'X' ? 'O' : 'X'}`,
            placar: this.placar
        });

        this.removerJogador(ws);
    }


    //versão modificada - processar jogada
    processarJogada(ws, dados) {
        console.log("dados recebidos: processarJogada: ", dados);
        if (!this.jogoAtivo) return;

        let posicao = dados.posicao;

        if (dados.jogador !== this.jogadorAtual) {
            ws.send(JSON.stringify({
                tipo: 'INVALID',
                mensagem: 'Não é sua vez!'
            }));
            return;
        }

        if (this.tabuleiro[posicao[0]][posicao[1]] !== '') {
            ws.send(JSON.stringify({
                tipo: 'INVALID',
                mensagem: 'Posição já ocupada!'
            }));
            return;
        }

        this.tabuleiro[posicao[0]][posicao[1]] = dados.jogador;

        // Verificar vitória
        if (this.verificarVitoria()) {
            this.placar[dados.jogador]++;
            this.enviarParaTodos({
                tipo: 'WIN',
                tabuleiro: this.tabuleiro,
                mensagem: `Jogador ${dados.jogador} venceu!`,
                placar: this.placar
            });
            this.reiniciarJogo();
            return;
        }

        // Verificar empate 
        // // percorrer o tabuleiro e verificar se todas as celulas estão preenchidas        
        let verifica = false;
        for (let i = 0; i < this.tabuleiro.length; i++) {
            for (let j = 0; j < this.tabuleiro[i].length; j++) {
                if (this.tabuleiro[i][j] === '') {
                    verifica = true;
                    break;
                }
            }
        }
        if (verifica === false) {
            this.placar[empates]++;
            this.enviarParaTodos({
                tipo: 'DRAW',
                tabuleiro: this.tabuleiro,
                mensagem: 'Empate!',
                placar: this.placar
            });
            //this.reiniciarJogo();
            return;
        }

        // Próximo jogador
        this.jogadorAtual = this.jogadorAtual === 'X' ? 'O' : 'X';

        this.enviarParaTodos({
            tipo: 'OK',
            tabuleiro: this.tabuleiro,
            status: `Vez do jogador ${this.jogadorAtual}`,
            proximoJogador: this.jogadorAtual
        });
    }
    //modificada para utilizar matrizes.
    verificarVitoria() {
        // Exemplo: [[ 'X', 'O', '' ], [ '', 'X', 'O' ], [ 'O', '', 'X' ]]

        const matriz = this.tabuleiro;

        // Verificar linhas horizontais
        for (let i = 0; i < 3; i++) {
            if (matriz[i][0] !== '' &&
                matriz[i][0] === matriz[i][1] &&
                matriz[i][0] === matriz[i][2]) {
                return true;
            }
        }

        // Verificar linhas verticais
        for (let j = 0; j < 3; j++) {
            if (matriz[0][j] !== '' &&
                matriz[0][j] === matriz[1][j] &&
                matriz[0][j] === matriz[2][j]) {
                return true;
            }
        }

        // Verificar diagonal principal
        if (matriz[0][0] !== '' &&
            matriz[0][0] === matriz[1][1] &&
            matriz[0][0] === matriz[2][2]) {
            return true;
        }

        // Verificar diagonal secundária
        if (matriz[0][2] !== '' &&
            matriz[0][2] === matriz[1][1] &&
            matriz[0][2] === matriz[2][0]) {
            return true;
        }

        return false;
    }
    //modificado para simplificar codigo
    reiniciarJogo() {
        this.tabuleiro = [['', '', ''], ['', '', ''], ['', '', '']];
        this.jogadorAtual = 'X';
        this.jogoAtivo = true;
        //this.placar = { X: 0, O: 0, empates: 0 };
    }
    //modificar o tabuleiro e outros dados para  começar outra partida 
    reiniciarNovoJogo() {
        this.tabuleiro = [['', '', ''], ['', '', ''], ['', '', '']];
        this.jogadorAtual = 'X';
        this.jogoAtivo = true;
    }
    novoJogo() {
        this.reiniciarNovoJogo();

        // Enviar mensagem específica para cada jogador usando for loop
        for (let i = 0; i < this.jogadores.length; i++) {
            const ws = this.jogadores[i];
            const jogador = i === 0 ? 'X' : 'O';
            const status = i === 0 ?
                'Novo jogo iniciado! Sua vez (X)' :
                'Novo jogo iniciado! Aguardando jogador X';

            ws.send(JSON.stringify({
                tipo: 'NOVO',
                tabuleiro: this.tabuleiro,
                status: status,
                jogadorAtual: this.jogadorAtual,
                jogoAtivo: this.jogoAtivo,
                placar: this.placar,
                jogador: jogador  // Informar qual jogador é este cliente
            }));
        }
    }

    //-- iniciar o jogo pela primeira vez ---
    iniciarJogo() {
        this.reiniciarJogo();
        this.enviarParaTodos({
            tipo: 'INICIAL',
            tabuleiro: this.tabuleiro,
            status: 'Novo jogo iniciado! Vez do jogador X',
            jogadorAtual: this.jogadorAtual,
            jogoAtivo: this.jogoAtivo
        });
    }
    //envia a mensagem para todos os jogadores (ja modificada)
    enviarParaTodos(mensagem) {
        const mensagemStr = JSON.stringify(mensagem);

        for (let jogador of this.jogadores) {
            if (jogador.readyState === WebSocket.OPEN) {
                jogador.send(mensagemStr);
            }
        }
    }
}

const jogo = new JogoDaVelhaServidor();

wss.on('connection', (ws) => {
    console.log('Novo cliente conectado');
    jogo.adicionarJogador(ws);

    ws.on('message', (data) => {
        try {
            const mensagem = JSON.parse(data);

            switch (mensagem.tipo) {
                case 'MARK':
                    jogo.processarJogada(ws, mensagem);
                    break;
                case 'NOVO':
                    jogo.novoJogo();
                    break;
                case 'QUIT':
                    jogo.processarDesistencia(ws);
                    break;
            }
        } catch (error) {
            console.error('Erro ao processar mensagem:', error);
        }
    });



    ws.on('close', () => {
        console.log('Cliente desconectado');
        jogo.removerJogador(ws);
    });

});

console.log('Servidor WebSocket rodando na porta 8765');


/*
// Adicione no início do server.js
const express = require('express');
const path = require('path');

const app = express();

// Servir arquivos estáticos (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Rota principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ... resto do seu código WebSocket
// server.js




const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8765 });
const clients = [];
let tabuleiro = ["-", "-", "-", "-", "-", "-", "-", "-", "-"];
let canMove = true;
let win = false;

console.log("Servidor aguardando conexões em ws://0.0.0.0:8765");

wss.on('connection', (ws) => {
    if (clients.length >= 2) {
        ws.send("Servidor cheio. Aguarde.");
        ws.close();
        return;
    }

    clients.push(ws);
    const jogadorId = clients.length;
    console.log(`Jogador ${jogadorId} conectado.`);
    ws.send(`Você é o Jogador ${jogadorId}`);

    ws.on('message', (message) => {
        console.log(`Jogador ${jogadorId} disse: ${message}`);
        for (i of tabuleiro) {    //Analisa as posições do tabuleiro e verifica as posições válidas
            if (i != "-") {
                canMove = false;
            }
        }
        clients.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(`Jogador ${jogadorId}: ${message}`);
            }
            if ((message.toString()).startsWith("MARK") == true && ((message.toString()).trim()).length == 6) {     //Movimentação
                x = Number(message.toString()[5]);
                if (tabuleiro[x] === "-") { //Define se é ou não possível realizar o movimento
                    canMove = true;
                }
                if ((x >= 0 && x <= 8) && canMove == true) {
                    client.send(`O jogador ${jogadorId} preencheu a posição ${x}`);
                    if (jogadorId == 1) {
                        tabuleiro[x] = "O";
                    } else {
                        tabuleiro[x] = "X";
                    }
                    client.send(`Tabuleiro: ${tabuleiro.join(" ")}`);
                } else {
                    client.send("Movimento inválido!");
                }
            } else if (message == "QUIT") {  //Desistência
                client.send(`O jogador ${jogadorId} desistiu!`);
                client.close();
            } else if (message == "BOARD") {     //Mostrar o Tabuleiro
                let linha1 = [];
                let linha2 = [];
                let linha3 = [];
                for (a in tabuleiro) {
                    if (a < 3) {
                        linha1.push(tabuleiro[a]);
                    } else if (a >= 3 && a < 6) {
                        linha2.push(tabuleiro[a]);
                    } else {
                        linha3.push(tabuleiro[a]);
                    }
                }
                client.send(linha1.join(" "));
                client.send(linha2.join(" "));
                client.send(linha3.join(" "));
            }
            if (((tabuleiro[0] == tabuleiro[1] && tabuleiro[1] == tabuleiro[2]) && (tabuleiro[0] != "-")) || ((tabuleiro[3] == tabuleiro[4] && tabuleiro[4] == tabuleiro[5]) && (tabuleiro[3] != "-")) || ((tabuleiro[6] == tabuleiro[7] && tabuleiro[7] == tabuleiro[8]) && (tabuleiro[6] != "-"))) {
                win = true;
                client.send(`O jogador ${jogadorId} venceu!`);
                client.close(); //Vitória Linhas
            } else if (((tabuleiro[0] == tabuleiro[3] && tabuleiro[3] == tabuleiro[6]) && (tabuleiro[0] != "-")) || ((tabuleiro[1] == tabuleiro[4] && tabuleiro[4] == tabuleiro[7]) && (tabuleiro[1] != "-")) || ((tabuleiro[2] == tabuleiro[5] && tabuleiro[5] == tabuleiro[8]) && (tabuleiro[2] != "-"))) {
                win = true;
                client.send(`O jogador ${jogadorId} venceu!`);
                client.close(); //Vitória Colunas
            } else if (((tabuleiro[0] == tabuleiro[4] && tabuleiro[4] == tabuleiro[8]) && (tabuleiro[0] != "-")) || ((tabuleiro[2] == tabuleiro[4] && tabuleiro[4] == tabuleiro[6]) && (tabuleiro[2] != "-"))) {
                win = true;
                client.send(`O jogador ${jogadorId} venceu!`);
                client.close(); //Vitória Diagonáis
            } else if (tabuleiro[0] != "-" && tabuleiro[1] != "-" && tabuleiro[2] != "-" && tabuleiro[3] != "-" && tabuleiro[4] != "-" && tabuleiro[5] != "-" && tabuleiro[6] != "-" && tabuleiro[7] != "-" && tabuleiro[8] != "-" && (win == false)) {
                client.send("Ocorreu um empate!");
                client.close(); //Empate
            }

        });
    });

    ws.on('close', () => {
        console.log(`Jogador ${jogadorId} desconectado.`);
        const index = clients.indexOf(ws);
        if (index > -1) clients.splice(index, 1);
    });

    ws.on('error', (err) => {
        console.error(`Erro do Jogador ${jogadorId}:`, err.message);
    });
});

*/