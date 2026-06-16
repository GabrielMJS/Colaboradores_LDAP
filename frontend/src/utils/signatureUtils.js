export async function drawSignature(canvas, colaborador, capaUrl) {
  if (!canvas || !colaborador) return null;
  const ctx = canvas.getContext("2d");

  return new Promise((resolve) => {
    const desenharComFallback = () => {
      // Capa não encontrada: gera com fundo padrão
      canvas.width = 700;
      canvas.height = 180;
      ctx.fillStyle = "#0d1f3c";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Borda arredondada visual
      ctx.strokeStyle = "rgba(100,150,255,0.3)";
      ctx.lineWidth = 1;
      ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);

      // Logo placeholder
      ctx.fillStyle = "#1565c0";
      ctx.fillRect(5, 30, 140, 110);
      ctx.font = "bold 28px Verdana, sans-serif";
      ctx.fillStyle = "#FFFFFF";
      ctx.fillText("AEB", 45, 95);

      // Linha divisória
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(160, 20);
      ctx.lineTo(160, 160);
      ctx.stroke();

      // Preparando os textos e condicionais
      const linhas = [];
      if (colaborador.nome) linhas.push({ text: colaborador.nome, font: "bold 20px Verdana, sans-serif", color: "#FFFFFF" });
      if (colaborador.cargo) linhas.push({ text: colaborador.cargo, font: "9px Verdana, sans-serif", color: "#90caf9" });
      if (colaborador.divisao_nome) linhas.push({ text: colaborador.divisao_nome, font: "10px Verdana, sans-serif", color: "#CCDDEE" });
      if (colaborador.coordenacao_nome) linhas.push({ text: colaborador.coordenacao_nome, font: "12px Verdana, sans-serif", color: "#CCDDEE" });
      if (colaborador.diretoria_nome) linhas.push({ text: colaborador.diretoria_nome, font: "14px Verdana, sans-serif", color: "#CCDDEE" });
      linhas.push({ text: "Agência Espacial Brasileira", font: "bold 12px Verdana, sans-serif", color: "#FFFFFF" });

      const ramal = colaborador.ramal || "";
      const email = colaborador.email || "";
      let ramalFormatado = "";
      if (ramal) {
        const apenasDigitos = String(ramal).replace(/\D/g, '');
        const digitosFinais = apenasDigitos.slice(-4);
        ramalFormatado = `(61) 2033-${digitosFinais || "XXXX"}`;
      } else {
        ramalFormatado = "(61) 2033-XXXX";
      }
      linhas.push({ text: `${ramalFormatado}    ${email}`, font: "9px Verdana, sans-serif", color: "#CCDDEE" });

      const textX = 161;
      let startY = 44;
      const lineH = 16;

      // Ajusta o Y inicial para centralizar verticalmente dependendo da quantidade de linhas
      // 180px height. O centro é 90. Se tivermos n linhas, ocuparemos (n-1)*16 altura total.
      const totalAltura = (linhas.length - 1) * lineH;
      // Deslocamos para cima a metade da altura total.
      // E adicionamos um padding para compensar a primeira fonte ser grande, mais 2% de deslocamento para baixo.
      startY = (canvas.height / 2) - (totalAltura / 2) + 6 + (canvas.height * 0.02);

      linhas.forEach(linha => {
        ctx.font = linha.font;
        ctx.fillStyle = linha.color;
        ctx.fillText(linha.text, textX, startY);
        startY += lineH;
      });

      resolve(canvas.toDataURL("image/png"));
    };

    if (capaUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = capaUrl;

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const visualScale = canvas.height / 180;
        const shiftX = 15 * (canvas.width / 700);
        const textX = canvas.width * 0.285 - 5 - shiftX;
        const lineSpacing = canvas.height * 0.10;

        const fontNome = Math.round(canvas.height * 0.110) + 4 - Math.round(2 * visualScale);
        const fontMedia = Math.round(canvas.height * 0.075) - Math.round(2 * visualScale);
        const fontPeq = fontMedia - 2;
        const fontAeb = Math.round(canvas.height * 0.098) - Math.round(2 * visualScale);

        const linhas = [];
        if (colaborador.nome) linhas.push({ text: colaborador.nome, font: `bold ${fontNome}px Verdana, sans-serif`, color: "#FFFFFF", extraSpacing: 0 });
        if (colaborador.cargo) linhas.push({ text: colaborador.cargo, font: `${fontPeq}px Verdana, sans-serif`, color: "#FFFFFF", extraSpacing: -(canvas.height * 0.01) });
        if (colaborador.divisao_nome) linhas.push({ text: colaborador.divisao_nome, font: `${fontPeq}px Verdana, sans-serif`, color: "#FFFFFF", extraSpacing: 0 });
        if (colaborador.coordenacao_nome) linhas.push({ text: colaborador.coordenacao_nome, font: `${fontPeq + 1}px Verdana, sans-serif`, color: "#FFFFFF", extraSpacing: 0 });
        if (colaborador.diretoria_nome) linhas.push({ text: colaborador.diretoria_nome, font: `${fontPeq + 2}px Verdana, sans-serif`, color: "#FFFFFF", extraSpacing: 0 });

        // Espaçamento antes da AEB
        linhas[linhas.length - 1].extraSpacing = (canvas.height * 0.01);

        linhas.push({ text: "Agência Espacial Brasileira", font: `bold ${fontAeb}px Verdana, sans-serif`, color: "#FFFFFF", extraSpacing: (canvas.height * 0.01) });

        const ramal = colaborador.ramal || "";
        const email = colaborador.email || "";
        let ramalFormatado = "";
        if (ramal) {
          const apenasDigitos = String(ramal).replace(/\D/g, '');
          const digitosFinais = apenasDigitos.slice(-4);
          ramalFormatado = `(61) 2033-${digitosFinais || "XXXX"}`;
        } else {
          ramalFormatado = "(61) 2033-XXXX";
        }
        linhas.push({ text: `${ramalFormatado}    ${email}`, font: `${fontPeq}px Verdana, sans-serif`, color: "#FFFFFF", extraSpacing: 0 });

        // Centralização vertical baseada no número de linhas + 2% de deslocamento para baixo
        const totalLineHeights = (linhas.length - 1) * lineSpacing + linhas.reduce((sum, l) => sum + (l.extraSpacing || 0), 0);
        let currentY = (canvas.height / 2) - (totalLineHeights / 2) + (10 * visualScale) + (canvas.height * 0.02);

        linhas.forEach(linha => {
          ctx.font = linha.font;
          ctx.fillStyle = linha.color;
          ctx.fillText(linha.text, textX, currentY);
          currentY += lineSpacing + (linha.extraSpacing || 0);
        });

        resolve(canvas.toDataURL("image/png"));
      };

      img.onerror = desenharComFallback;
    } else {
      desenharComFallback();
    }
  });
}
