<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:atom="http://www.w3.org/2005/Atom">
<xsl:output method="html" encoding="UTF-8" indent="yes"/>
<xsl:template match="/">
<html lang="en">
<head>
  <title>RSS Feed — Chimeraforge</title>
  <meta name="robots" content="noindex,nofollow"/>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;
      background:#070a10;
      color:#f7f5f2;
      min-height:100vh;
    }
    .wrap{max-width:720px;margin:0 auto;padding:3rem 1.5rem}
    .header{text-align:center;margin-bottom:2.5rem}
    .badge{
      display:inline-block;
      font-size:.75rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;
      padding:.35rem .9rem;border-radius:999px;
      background:rgba(234,101,51,.15);color:#ea6533;
      margin-bottom:1rem;
    }
    h1{font-size:1.75rem;font-weight:700;margin-bottom:.5rem}
    .subtitle{color:#939ba8;font-size:.9rem;line-height:1.6;max-width:540px;margin:0 auto}
    .hint{
      margin-top:1.25rem;padding:.75rem 1rem;border-radius:8px;
      background:rgba(21,184,201,.08);border:1px solid rgba(21,184,201,.15);
      font-size:.8rem;color:#15b8c9;
    }
    .hint code{
      background:rgba(255,255,255,.08);padding:.1rem .35rem;border-radius:3px;
      font-family:ui-monospace,SFMono-Regular,monospace;font-size:.78rem;
    }
    .episodes{list-style:none;margin-top:2rem}
    .episode{
      padding:1.25rem;margin-bottom:.75rem;border-radius:12px;
      border:1px solid rgba(255,255,255,.06);
      background:rgba(255,255,255,.02);
      transition:border-color .2s;
    }
    .episode:hover{border-color:rgba(234,101,51,.25)}
    .ep-title{font-size:1rem;font-weight:600;margin-bottom:.4rem}
    .ep-title a{color:#f7f5f2;text-decoration:none}
    .ep-title a:hover{color:#ea6533}
    .ep-date{font-size:.75rem;color:#939ba8;margin-bottom:.5rem;font-variant-numeric:tabular-nums}
    .ep-desc{font-size:.85rem;color:#939ba8;line-height:1.55}
    .footer{text-align:center;margin-top:2.5rem;color:#939ba8;font-size:.8rem}
    .footer a{color:#ea6533;text-decoration:none}
    .footer a:hover{text-decoration:underline}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <span class="badge">RSS Feed</span>
      <h1><xsl:value-of select="/rss/channel/title"/></h1>
      <p class="subtitle"><xsl:value-of select="/rss/channel/description"/></p>
      <div class="hint">
        This is an RSS feed. Copy the URL into your feed reader to subscribe. Showing the latest <strong><xsl:value-of select="count(/rss/channel/item)"/></strong> episodes.
      </div>
    </div>
    <ul class="episodes">
      <xsl:for-each select="/rss/channel/item">
        <li class="episode">
          <div class="ep-title"><a href="{link}"><xsl:value-of select="title"/></a></div>
          <div class="ep-date"><xsl:value-of select="pubDate"/></div>
          <div class="ep-desc"><xsl:value-of select="description"/></div>
        </li>
      </xsl:for-each>
    </ul>
    <p class="footer">
      <a href="/">Chimeraforge</a>
    </p>
  </div>
</body>
</html>
</xsl:template>
</xsl:stylesheet>
