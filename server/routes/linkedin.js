const express = require('express');
const router = express.Router();

// EXACT copy from working app: app/api/auth/linkedin/route.ts
router.get('/auth/linkedin', (req, res) => {
  const clientId = process.env.LINKEDIN_CLIENT_ID || process.env.QUORD_LINKEDIN_CLIENT_ID;
  // Build redirect URI dynamically from current host for dev; allow env override in production
  const isProduction = process.env.NODE_ENV === 'production';
  const dynamicRedirect = `${(req.headers['x-forwarded-proto'] || req.protocol)}://${req.get('host')}/api/auth/linkedin/callback`;
  const redirectUri = isProduction
    ? (process.env.LINKEDIN_REDIRECT_URI || dynamicRedirect)
    : dynamicRedirect;

  if (!clientId) {
    return res.status(500).json({ error: "LinkedIn client ID not configured" });
  }

  const scope = "openid profile email w_member_social";
  const state = Math.random().toString(36).substring(7);

  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${encodeURIComponent(scope)}`;

  res.redirect(authUrl);
});

// Helper to get frontend URL
const getFrontendUrl = () => process.env.CORS_ORIGIN || 'http://localhost:3004';

// EXACT copy from working app: app/api/auth/linkedin/callback/route.ts (adapted to redirect to frontend)
router.get('/auth/linkedin/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.redirect(`${getFrontendUrl()}/?error=access_denied`);
  }

  if (!code) {
    return res.redirect(`${getFrontendUrl()}/?error=no_code`);
  }

  const clientId = process.env.LINKEDIN_CLIENT_ID || process.env.QUORD_LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET || process.env.QUORD_LINKEDIN_CLIENT_SECRET;
  // Build redirect URI dynamically from current host for dev; allow env override in production
  const isProduction = process.env.NODE_ENV === 'production';
  const dynamicRedirect = `${(req.headers['x-forwarded-proto'] || req.protocol)}://${req.get('host')}/api/auth/linkedin/callback`;
  const redirectUri = isProduction
    ? (process.env.LINKEDIN_REDIRECT_URI || dynamicRedirect)
    : dynamicRedirect;

  if (!clientId || !clientSecret) {
    return res.redirect(`${getFrontendUrl()}/?error=config_error`);
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error("Token exchange failed:", errorData);
      return res.redirect(`${getFrontendUrl()}/?error=token_exchange_failed`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Set cookie with access token - EXACT copy from working app
    res.cookie("linkedin_access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    // Redirect back to frontend settings with success flag
    return res.redirect(`${getFrontendUrl()}/?view=settings&connected=true`);
  } catch (error) {
    console.error("OAuth callback error:", error);
    return res.redirect(`${getFrontendUrl()}/?error=server_error`);
  }
});

// EXACT copy from working app: app/api/linkedin/post/route.ts
router.post('/linkedin/post', async (req, res) => {
  const accessToken = req.cookies.linkedin_access_token;

  if (!accessToken) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const { text, image } = req.body;

    // Get user's LinkedIn ID
    const userInfoResponse = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userInfoResponse.ok) {
      return res.status(401).json({ error: "Failed to get user info" });
    }

    const userInfo = await userInfoResponse.json();
    const userId = userInfo.sub;

    let imageUrn = null;

    // Upload image if provided (from working app)
    if (image) {
      // Step 1: Register upload
      const registerResponse = await fetch("https://api.linkedin.com/v2/assets?action=registerUpload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          registerUploadRequest: {
            recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
            owner: `urn:li:person:${userId}`,
            serviceRelationships: [
              {
                relationshipType: "OWNER",
                identifier: "urn:li:userGeneratedContent",
              },
            ],
          },
        }),
      });

      if (!registerResponse.ok) {
        console.error("Image register failed:", await registerResponse.text());
        return res.status(500).json({ error: "Failed to register image upload" });
      }

      const registerData = await registerResponse.json();
      const uploadUrl = registerData.value.uploadMechanism["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"].uploadUrl;
      imageUrn = registerData.value.asset;

      // Step 2: Upload image (simplified - would need proper image handling)
      // For now, skip image upload to focus on text posts
    }

    // Create post - EXACT copy from working app
    const postBody = {
      author: `urn:li:person:${userId}`,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: {
            text: text,
          },
          shareMediaCategory: imageUrn ? "IMAGE" : "NONE",
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    };

    if (imageUrn) {
      postBody.specificContent["com.linkedin.ugc.ShareContent"].media = [
        {
          status: "READY",
          media: imageUrn,
        },
      ];
    }

    const postResponse = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(postBody),
    });

    if (!postResponse.ok) {
      const errorText = await postResponse.text();
      console.error("Post creation failed:", errorText);
      return res.status(500).json({ error: "Failed to create post" });
    }

    const postData = await postResponse.json();

    return res.json({ success: true, postId: postData.id });
  } catch (error) {
    console.error("Error posting to LinkedIn:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Check LinkedIn authentication status
router.get('/linkedin/status', async (req, res) => {
  const accessToken = req.cookies.linkedin_access_token;

  if (!accessToken) {
    return res.json({ isAuthenticated: false });
  }

  try {
    // Verify token by fetching user info
    const userInfoResponse = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userInfoResponse.ok) {
      res.clearCookie('linkedin_access_token');
      return res.json({ isAuthenticated: false });
    }

    const userInfo = await userInfoResponse.json();
    res.json({ 
      isAuthenticated: true, 
      user: {
        id: userInfo.sub,
        name: userInfo.name,
        email: userInfo.email,
        picture: userInfo.picture
      }
    });
  } catch (error) {
    console.error('LinkedIn status check error:', error);
    res.clearCookie('linkedin_access_token');
    res.json({ isAuthenticated: false });
  }
});

// Logout from LinkedIn
router.post('/linkedin/logout', (req, res) => {
  res.clearCookie('linkedin_access_token');
  res.json({ success: true, message: 'Logged out from LinkedIn' });
});

module.exports = router;
