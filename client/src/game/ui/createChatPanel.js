import { GAME_SIZE } from "../constants.js";
import { createPanel } from "./createPanel.js";
import { escapeHtml } from "../utils/safeHtml.js";
import { sanitizeChatMessage, sanitizePlayerName, sanitizePlainText } from "../utils/userContentValidation.js";

function createChatMarkup() {
  return `
    <div class="hud-panel-content hud-panel-content--chat">
      <div data-chat-log class="chat-log"></div>
      <form class="chat-form chat-form--hud">
        <input name="chatMessage" type="text" maxlength="140" placeholder="Mesaj yaz..." style="flex: 1;" />
        <button type="submit">Gonder</button>
      </form>
    </div>
  `;
}

function formatTimestamp(timestamp) {
  if (!timestamp) {
    return "--:--";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export function createChatPanel(scene) {
  const { height } = GAME_SIZE;
  const history = [];
  let isVisibleByPreference = true;

  const frame = createPanel(scene, {
    x: 252,
    y: height - 132,
    width: 424,
    height: 206,
    fillColor: 0x081722,
    fillAlpha: 0.92,
    strokeColor: 0x9bd3ff,
    strokeAlpha: 0.16,
    scrollFactor: 0,
  });

  scene.add
    .text(58, height - 224, "Kasaba Sohbeti", {
      fontFamily: "Georgia",
      fontSize: "21px",
      fontStyle: "bold",
      color: "#fff4db",
    })
    .setScrollFactor(0);

  const hint = scene.add
    .text(58, height - 196, "Oda akisi | Enter: yaz | Esc: kapat", {
      fontFamily: "Trebuchet MS",
      fontSize: "12px",
      color: "#8fb7cf",
    })
    .setScrollFactor(0);

  const messageLabel = scene.add
    .text(58, height - 170, "Yalnizca bulundugun odadaki mesajlari gorursun.", {
      fontFamily: "Trebuchet MS",
      fontSize: "12px",
      color: "#d7ebf7",
      lineSpacing: 4,
      wordWrap: { width: 382 },
    })
    .setScrollFactor(0);

  const formElement = scene.add.dom(252, height - 66).createFromHTML(createChatMarkup()).setVisible(true);
  const form = formElement.node.querySelector("form");
  const input = formElement.node.querySelector("input");
  const chatLog = formElement.node.querySelector("[data-chat-log]");

  const updateHistory = () => {
    chatLog.innerHTML = history
      .map((message) => {
        const tone = message.kind === "system" ? "#ffd99d" : "#dbeefa";
        const timestamp = formatTimestamp(message.timestamp);
        const channelLabel = message.channel === "party" ? `<span style="color:#b8f2c8;">[Party]</span> ` : "";
        const speakerText = escapeHtml(sanitizePlayerName(message.name, "System"));
        const speaker = message.kind === "system" ? speakerText : `<strong>${speakerText}</strong>`;
        const messageText = escapeHtml(
          message.kind === "system" ? sanitizePlainText(message.text, 280) : sanitizeChatMessage(message.text),
        );
        return `<div style="margin-bottom: 6px; color: ${tone};"><span style="color: #8bb7d6;">[${timestamp}]</span> ${channelLabel}${speaker}: ${messageText}</div>`;
      })
      .join("");
    chatLog.scrollTop = chatLog.scrollHeight;
  };

  const open = () => {
    window.setTimeout(() => input?.focus(), 20);
  };

  const close = () => {
    input.value = "";
    input.blur();
  };

  const setVisibilityPreference = (isVisible) => {
    isVisibleByPreference = Boolean(isVisible);
    frame.setVisible(isVisibleByPreference);
    hint.setVisible(isVisibleByPreference);
    messageLabel.setVisible(isVisibleByPreference);
    formElement.setVisible(isVisibleByPreference);
    if (!isVisibleByPreference) {
      close();
    }
  };

  return {
    isOpen() {
      return isVisibleByPreference && document.activeElement === input;
    },
    open,
    close,
    setVisibilityPreference,
    pushMessage(message) {
      history.push(message);

      if (history.length > 40) {
        history.shift();
      }

      updateHistory();
    },
    setMessages(messages) {
      history.splice(0, history.length, ...messages.slice(-40));
      updateHistory();
    },
    onSubmit(callback) {
      const handler = (event) => {
        event.preventDefault();
        callback(input.value);
      };

      form.addEventListener("submit", handler);

      return () => {
        form.removeEventListener("submit", handler);
      };
    },
  };
}
