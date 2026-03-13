// Code Nexus => https://discord.gg/wBTyCap8
/**
 * Chart renderer using @napi-rs/canvas + D3.js
 * Used by commands/chart.js
 */
const { createCanvas } = require('@napi-rs/canvas');
const d3 = require('d3');

// ── Palette ──────────────────────────────────────────────────────────────────
const COLORS = {
    bg:         '#2B2D31',   // Discord dark background
    bgCard:     '#1E1F22',   // Card background
    accent:     '#5865F2',   // Discord blurple
    text:       '#FFFFFF',
    textMuted:  '#B5BAC1',
    border:     '#3F4147',
    bars: ['#5865F2', '#57F287', '#ED4245', '#FEE75C', '#EB459E', '#00B0FF'],
    active:     '#57F287',   // green
    expired:    '#ED4245',   // red
    cancelled:  '#FEE75C',   // yellow
};

const W = 900;
const H = 500;
const PADDING = { top: 80, right: 40, bottom: 70, left: 80 };

// ── Shared helpers ────────────────────────────────────────────────────────────
function initCanvas() {
    const canvas = createCanvas(W, H);
    const ctx    = canvas.getContext('2d');
    // Background
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, W, H);
    return { canvas, ctx };
}

function drawTitle(ctx, title, subtitle) {
    // Top bar
    ctx.fillStyle = COLORS.bgCard;
    ctx.fillRect(0, 0, W, 56);
    // Title
    ctx.fillStyle = COLORS.text;
    ctx.font      = 'bold 22px sans-serif';
    ctx.fillText(title, 24, 35);
    // Subtitle
    if (subtitle) {
        ctx.fillStyle = COLORS.textMuted;
        ctx.font      = '13px sans-serif';
        ctx.fillText(subtitle, 24, 52);
    }
    // Accent line under header
    ctx.fillStyle = COLORS.accent;
    ctx.fillRect(0, 54, W, 3);
}

function drawFooter(ctx) {
    ctx.fillStyle = COLORS.bgCard;
    ctx.fillRect(0, H - 28, W, 28);
    ctx.fillStyle = COLORS.textMuted;
    ctx.font      = '12px sans-serif';
    ctx.fillText('Code Nexus  |  discord.gg/wBTyCap8', 24, H - 9);
    const ts = new Date().toUTCString();
    ctx.textAlign = 'right';
    ctx.fillText(ts, W - 24, H - 9);
    ctx.textAlign = 'left';
}

function roundRect(ctx, x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

// ── Chart: Status (horizontal bar) ───────────────────────────────────────────
function renderStatus(data) {
    // data: { active, expired, cancelled }
    const { canvas, ctx } = initCanvas();
    drawTitle(ctx, '📊  Subscription Status', 'Active · Expired · Cancelled breakdown');
    drawFooter(ctx);

    const items = [
        { label: 'Active',    value: data.active,    color: COLORS.active    },
        { label: 'Expired',   value: data.expired,   color: COLORS.expired   },
        { label: 'Cancelled', value: data.cancelled, color: COLORS.cancelled },
    ];
    const total = items.reduce((s, i) => s + i.value, 0);

    const chartX = PADDING.left;
    const chartY = PADDING.top + 20;
    const chartW = W - PADDING.left - PADDING.right;
    const chartH = H - PADDING.top - PADDING.bottom - 20;

    const scale = d3.scaleLinear()
        .domain([0, Math.max(total, 1)])
        .range([0, chartW]);

    const bandH  = Math.floor(chartH / items.length);
    const barH   = Math.floor(bandH * 0.55);
    const barGap = Math.floor((bandH - barH) / 2);

    items.forEach((item, i) => {
        const y      = chartY + i * bandH + barGap;
        const barW   = scale(item.value);
        const pct    = total > 0 ? Math.round(item.value / total * 100) : 0;

        // Bar background
        ctx.fillStyle = COLORS.bgCard;
        roundRect(ctx, chartX, y, chartW, barH, 6);
        ctx.fill();

        // Filled bar
        if (barW > 0) {
            ctx.fillStyle = item.color;
            roundRect(ctx, chartX, y, barW, barH, 6);
            ctx.fill();
        }

        // Label
        ctx.fillStyle = COLORS.text;
        ctx.font      = 'bold 15px sans-serif';
        ctx.fillText(item.label, chartX - 12, y + barH / 2 + 5, chartX - 4);

        // Right-aligned value
        ctx.textAlign = 'right';
        ctx.fillStyle = COLORS.textMuted;
        ctx.font      = '13px sans-serif';
        ctx.fillText(item.value + '  (' + pct + '%)', W - PADDING.right, y + barH / 2 + 5);
        ctx.textAlign = 'left';
    });

    // Total label
    ctx.fillStyle = COLORS.textMuted;
    ctx.font      = '13px sans-serif';
    ctx.fillText('Total: ' + total + ' subscriptions', chartX, chartY + items.length * bandH + 22);

    return canvas.toBuffer('image/png');
}

// ── Chart: Bar (plans or services) ───────────────────────────────────────────
function renderBar(data, title, subtitle) {
    // data: [{ label, value }]
    const { canvas, ctx } = initCanvas();
    drawTitle(ctx, title, subtitle);
    drawFooter(ctx);

    if (!data || data.length === 0) {
        ctx.fillStyle = COLORS.textMuted;
        ctx.font      = '18px sans-serif';
        ctx.fillText('No data available', W / 2 - 80, H / 2);
        return canvas.toBuffer('image/png');
    }

    const chartX = PADDING.left;
    const chartY = PADDING.top + 10;
    const chartW = W - PADDING.left - PADDING.right;
    const chartH = H - PADDING.top - PADDING.bottom - 10;

    const maxVal = d3.max(data, d => d.value) || 1;

    const xScale = d3.scaleBand()
        .domain(data.map(d => d.label))
        .range([0, chartW])
        .padding(0.3);

    const yScale = d3.scaleLinear()
        .domain([0, maxVal * 1.15])
        .range([chartH, 0]);

    // Gridlines
    const ticks = yScale.ticks(5);
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth   = 1;
    ticks.forEach(t => {
        const ty = chartY + yScale(t);
        ctx.beginPath();
        ctx.moveTo(chartX, ty);
        ctx.lineTo(chartX + chartW, ty);
        ctx.stroke();
        ctx.fillStyle = COLORS.textMuted;
        ctx.font      = '11px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(t, chartX - 8, ty + 4);
        ctx.textAlign = 'left';
    });

    // Bars
    data.forEach((d, i) => {
        const bx = chartX + xScale(d.label);
        const bw = xScale.bandwidth();
        const bh = chartH - yScale(d.value);
        const by = chartY + yScale(d.value);

        ctx.fillStyle = COLORS.bars[i % COLORS.bars.length];
        roundRect(ctx, bx, by, bw, bh, 5);
        ctx.fill();

        // Value above bar
        ctx.fillStyle = COLORS.text;
        ctx.font      = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(d.value, bx + bw / 2, by - 6);

        // X-axis label (truncated)
        ctx.fillStyle = COLORS.textMuted;
        ctx.font      = '12px sans-serif';
        const lbl = d.label.length > 10 ? d.label.slice(0, 9) + '…' : d.label;
        ctx.fillText(lbl, bx + bw / 2, chartY + chartH + 18);
        ctx.textAlign = 'left';
    });

    // X axis line
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.moveTo(chartX, chartY + chartH);
    ctx.lineTo(chartX + chartW, chartY + chartH);
    ctx.stroke();

    return canvas.toBuffer('image/png');
}

// ── Chart: Timeline (line chart) ──────────────────────────────────────────────
function renderTimeline(data, monthCount) {
    // data: [{ label: 'YYYY-MM', value: number }]
    const { canvas, ctx } = initCanvas();
    drawTitle(ctx, '📅  Subscription Timeline', 'New subscriptions per month · last ' + monthCount + ' months');
    drawFooter(ctx);

    const chartX = PADDING.left;
    const chartY = PADDING.top + 10;
    const chartW = W - PADDING.left - PADDING.right;
    const chartH = H - PADDING.top - PADDING.bottom - 10;

    const maxVal = d3.max(data, d => d.value) || 1;

    const xScale = d3.scaleBand()
        .domain(data.map(d => d.label))
        .range([0, chartW])
        .padding(0.1);

    const yScale = d3.scaleLinear()
        .domain([0, maxVal * 1.15])
        .range([chartH, 0]);

    // Gridlines
    const ticks = yScale.ticks(5);
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth   = 1;
    ticks.forEach(t => {
        const ty = chartY + yScale(t);
        ctx.beginPath();
        ctx.moveTo(chartX, ty);
        ctx.lineTo(chartX + chartW, ty);
        ctx.stroke();
        ctx.fillStyle = COLORS.textMuted;
        ctx.font      = '11px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(t, chartX - 8, ty + 4);
        ctx.textAlign = 'left';
    });

    // Area fill under line
    const pts = data.map(d => ({
        x: chartX + xScale(d.label) + xScale.bandwidth() / 2,
        y: chartY + yScale(d.value)
    }));

    if (pts.length > 1) {
        const grad = ctx.createLinearGradient(0, chartY, 0, chartY + chartH);
        grad.addColorStop(0, 'rgba(88,101,242,0.45)');
        grad.addColorStop(1, 'rgba(88,101,242,0.02)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, chartY + chartH);
        pts.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.lineTo(pts[pts.length - 1].x, chartY + chartH);
        ctx.closePath();
        ctx.fill();

        // Line
        ctx.strokeStyle = COLORS.accent;
        ctx.lineWidth   = 3;
        ctx.lineJoin    = 'round';
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
        ctx.stroke();

        // Dots
        pts.forEach((p, i) => {
            ctx.fillStyle   = COLORS.accent;
            ctx.strokeStyle = COLORS.bg;
            ctx.lineWidth   = 3;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Value above dot
            ctx.fillStyle = COLORS.text;
            ctx.font      = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(data[i].value, p.x, p.y - 12);
            ctx.textAlign = 'left';
        });
    }

    // X labels
    data.forEach(d => {
        const bx = chartX + xScale(d.label) + xScale.bandwidth() / 2;
        ctx.fillStyle = COLORS.textMuted;
        ctx.font      = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(d.label, bx, chartY + chartH + 18);
        ctx.textAlign = 'left';
    });

    // X axis line
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.moveTo(chartX, chartY + chartH);
    ctx.lineTo(chartX + chartW, chartY + chartH);
    ctx.stroke();

    return canvas.toBuffer('image/png');
}

// ── Chart: Donut (status breakdown) ──────────────────────────────────────────
function renderDonut(data) {
    // data: { active, expired, cancelled }
    const { canvas, ctx } = initCanvas();
    drawTitle(ctx, '🍩  Status Breakdown', 'Active · Expired · Cancelled');
    drawFooter(ctx);

    const items = [
        { label: 'Active',    value: data.active    ?? 0, color: COLORS.active    },
        { label: 'Expired',   value: data.expired   ?? 0, color: COLORS.expired   },
        { label: 'Cancelled', value: data.cancelled ?? 0, color: COLORS.cancelled },
    ];
    const total = items.reduce((s, i) => s + i.value, 0);

    // ── Donut geometry ──────────────────────────────────────────────────────
    const cx     = 295;
    const cy     = 280;
    const outerR = 160;
    const innerR = 88;
    const gap    = 0.03; // radians gap between segments

    if (total === 0) {
        // Empty state — single grey ring
        ctx.strokeStyle = COLORS.border;
        ctx.lineWidth   = outerR - innerR;
        ctx.beginPath();
        ctx.arc(cx, cy, (outerR + innerR) / 2, 0, 2 * Math.PI);
        ctx.stroke();
    } else {
        let startAngle = -Math.PI / 2;
        items.forEach(item => {
            if (item.value === 0) return;
            const angle = (item.value / total) * 2 * Math.PI;

            // Shadow / glow
            ctx.save();
            ctx.shadowColor = item.color;
            ctx.shadowBlur  = 18;
            ctx.fillStyle   = item.color;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, outerR, startAngle + gap / 2, startAngle + angle - gap / 2);
            ctx.closePath();
            ctx.fill();
            ctx.restore();

            startAngle += angle;
        });

        // Punch hole (donut)
        ctx.fillStyle = COLORS.bg;
        ctx.beginPath();
        ctx.arc(cx, cy, innerR, 0, 2 * Math.PI);
        ctx.fill();

        // Inner ring border
        ctx.strokeStyle = COLORS.border;
        ctx.lineWidth   = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, innerR, 0, 2 * Math.PI);
        ctx.stroke();
    }

    // ── Center text ─────────────────────────────────────────────────────────
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.text;
    ctx.font      = 'bold 38px sans-serif';
    ctx.fillText(total, cx, cy + 10);
    ctx.fillStyle = COLORS.textMuted;
    ctx.font      = '14px sans-serif';
    ctx.fillText('total', cx, cy + 30);
    ctx.textAlign = 'left';

    // ── Legend cards (right side) ────────────────────────────────────────────
    const lx   = 520;
    const ly   = 130;
    const boxW = 310;
    const boxH = 72;
    const gap2 = 18;

    items.forEach((item, i) => {
        const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
        const y   = ly + i * (boxH + gap2);

        // Card background
        ctx.fillStyle = COLORS.bgCard;
        roundRect(ctx, lx, y, boxW, boxH, 10);
        ctx.fill();

        // Left accent stripe
        ctx.fillStyle = item.color;
        roundRect(ctx, lx, y, 7, boxH, 4);
        ctx.fill();

        // Label (muted, small)
        ctx.fillStyle = COLORS.textMuted;
        ctx.font      = '12px sans-serif';
        ctx.fillText(item.label.toUpperCase(), lx + 22, y + 22);

        // Count (big, white)
        ctx.fillStyle = COLORS.text;
        ctx.font      = 'bold 26px sans-serif';
        ctx.fillText(item.value, lx + 22, y + 54);

        // Percentage (right-aligned, colored)
        ctx.fillStyle  = item.color;
        ctx.font       = 'bold 20px sans-serif';
        ctx.textAlign  = 'right';
        ctx.fillText(pct + '%', lx + boxW - 18, y + 54);
        ctx.textAlign  = 'left';
    });

    return canvas.toBuffer('image/png');
}

module.exports = { renderStatus, renderBar, renderTimeline, renderDonut };
// Code Nexus => https://discord.gg/wBTyCap8
