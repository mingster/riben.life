# Google Analytics Complete Guide for riben.life

This comprehensive guide covers Google Analytics setup, configuration, and usage for the riben.life platform, including web app, Android TV, and Roku analytics.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Quick Setup](#quick-setup)
3. [Web App Analytics](#web-app-analytics)
4. [Server-Side Analytics (Roku)](#server-side-analytics-roku)
5. [Components & Utilities](#components--utilities)
6. [Event Tracking](#event-tracking)
7. [Testing & Debugging](#testing--debugging)
8. [Privacy & Compliance](#privacy--compliance)
9. [Troubleshooting](#troubleshooting)
10. [Migration Notes](#migration-notes)

## 🎯 Overview

The riben.life platform uses a dual analytics approach:

- **Web App**: Google Analytics 4 via Next.js third-parties
- **Roku App**: Server-side analytics via Google Analytics Measurement Protocol
- **Android TV**: Server-side analytics via Google Analytics Measurement Protocol

This provides unified analytics across all platforms while respecting the technical constraints of each platform.

## 🚀 Quick Setup

### Environment Variables

```bash
# Web App Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Server-side Analytics (Roku/Android TV)
GTM_MEASUREMENT_ID=G-XXXXXXXXXX
GTM_API_SECRET=your_api_secret_here
```

### Google Analytics Setup

1. Go to [Google Analytics](https://analytics.google.com/)
2. Create a new GA4 property or use an existing one
3. Copy the Measurement ID (format: G-XXXXXXXXXX)
4. Add it to your environment variables
5. For server-side analytics, create an API secret in GA4

## 🌐 Web App Analytics

### Core Components

#### **GoogleAnalytics Component**

```tsx
// src/app/layout.tsx
import { GoogleAnalytics } from "@next/third-parties/google";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
          <GoogleAnalytics
            gaId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}
          />
        )}
      </body>
    </html>
  );
}
```

#### **PageViewTracker Component**

```tsx
// src/components/analytics/page-view-tracker.tsx
"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { sendGAEvent } from "@next/third-parties/google";

export function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
      const title = document.title;
      
      sendGAEvent({
        event: "page_view",
        page_title: title,
        page_location: url,
        page_path: pathname,
      });
    }
  }, [pathname, searchParams]);

  return null;
}
```

### Analytics Utilities

#### **Main Analytics Library**

```tsx
// src/lib/analytics.ts
import { sendGAEvent } from "@next/third-parties/google";

export const analytics = {
  // Authentication events
  trackLogin: (method: "email" | "google" | "line" | "passkey" = "email") => {
    sendGAEvent({
      event: "login",
      method: method,
    });
  },

  trackSignUp: (method: "email" | "google" | "line" = "email") => {
    sendGAEvent({
      event: "sign_up",
      method: method,
    });
  },

  trackLogout: () => {
    sendGAEvent({
      event: "logout",
      event_category: "authentication",
    });
  },

  // Video/Content events
  trackVideoPlay: (videoTitle: string, videoId?: string, channelName?: string) => {
    sendGAEvent({
      event: "video_play",
      event_category: "video",
      event_label: videoTitle,
      video_id: videoId,
      channel_name: channelName,
    });
  },

  trackVideoComplete: (videoTitle: string, videoId?: string, channelName?: string) => {
    sendGAEvent({
      event: "video_complete",
      event_category: "video",
      event_label: videoTitle,
      video_id: videoId,
      channel_name: channelName,
    });
  },

  trackChannelView: (channelName: string, channelId?: string) => {
    sendGAEvent({
      event: "channel_view",
      event_category: "content",
      event_label: channelName,
      channel_id: channelId,
    });
  },

  // Device events
  trackDeviceRegistration: (deviceType: "android_tv" | "roku" | "web", deviceId?: string) => {
    sendGAEvent({
      event: "device_registration",
      event_category: "device",
      device_type: deviceType,
      device_id: deviceId,
    });
  },

  trackDeviceLinking: (deviceType: "android_tv" | "roku", success: boolean = true) => {
    sendGAEvent({
      event: "device_linking",
      event_category: "device",
      device_type: deviceType,
      success: success,
    });
  },

  // Error tracking
  trackError: (errorType: string, errorMessage: string, page?: string) => {
    sendGAEvent({
      event: "exception",
      event_category: "error",
      error_type: errorType,
      error_message: errorMessage,
      page: page,
    });
  },

  // Custom event tracking
  trackCustomEvent: (eventName: string, parameters?: Record<string, any>) => {
    sendGAEvent({
      event: eventName,
      ...parameters,
    });
  },
};
```

#### **Tracked Components**

##### **TrackedButton**

```tsx
// src/components/analytics/tracked-button.tsx
"use client";

import { Button } from "@/components/ui/button";
import { sendGAEvent } from "@next/third-parties/google";

interface TrackedButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  trackingEvent?: string;
  trackingParameters?: Record<string, any>;
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}

export function TrackedButton({
  children,
  onClick,
  trackingEvent,
  trackingParameters,
  className,
  variant = "default",
  size = "default",
  disabled = false,
  type = "button",
}: TrackedButtonProps) {
  const handleClick = () => {
    if (trackingEvent) {
      sendGAEvent({
        event: trackingEvent,
        ...trackingParameters,
      });
    } else {
      sendGAEvent({
        event: "click",
        event_category: "button",
        event_label: typeof children === "string" ? children : "button",
      });
    }

    if (onClick) {
      onClick();
    }
  };

  return (
    <Button
      onClick={handleClick}
      className={className}
      variant={variant}
      size={size}
      disabled={disabled}
      type={type}
    >
      {children}
    </Button>
  );
}
```

##### **TrackedForm**

```tsx
// src/components/analytics/tracked-form.tsx
"use client";

import { FormEvent, ReactNode } from "react";
import { sendGAEvent } from "@next/third-parties/google";

interface TrackedFormProps {
  children: ReactNode;
  onSubmit?: (e: FormEvent<HTMLFormElement>) => void;
  formName: string;
  className?: string;
  method?: "GET" | "POST";
  action?: string;
}

export function TrackedForm({
  children,
  onSubmit,
  formName,
  className,
  method = "POST",
  action,
}: TrackedFormProps) {
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    sendGAEvent({
      event: "form_submit",
      event_category: "form",
      form_name: formName,
    });

    if (onSubmit) {
      onSubmit(e);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={className}
      method={method}
      action={action}
    >
      {children}
    </form>
  );
}
```

## 📱 Server-Side Analytics (Roku)

### API Endpoint

```typescript
// src/app/api/pstv/devices/analytics/route.ts
import { NextRequest, NextResponse } from "next/server";
import logger from "@/lib/logger";

// Send analytics data to Google Analytics via Measurement Protocol
async function sendToGoogleTagManager(analyticsData: any) {
  try {
    const measurementId = process.env.GTM_MEASUREMENT_ID;
    const apiSecret = process.env.GTM_API_SECRET;
    
    if (!measurementId || !apiSecret) {
      logger.warn("GTM credentials not configured", {
        metadata: { measurementId: !!measurementId, apiSecret: !!apiSecret },
        tags: ["analytics", "gtm", "config"],
      });
      return;
    }

    const gtmPayload = transformToGTMFormat(analyticsData);
    const gtmUrl = `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`;
    
    const response = await fetch(gtmUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(gtmPayload),
    });

    if (!response.ok) {
      throw new Error(`GTM request failed: ${response.status} ${response.statusText}`);
    }

    logger.info("Analytics data sent to GTM successfully", {
      metadata: {
        event_name: analyticsData.event_name,
        gtm_response_status: response.status,
      },
      tags: ["analytics", "gtm", "success"],
    });

  } catch (error) {
    logger.error("Failed to send analytics to GTM", {
      metadata: {
        error: error instanceof Error ? error.message : "Unknown error",
        event_name: analyticsData.event_name,
      },
      tags: ["analytics", "gtm", "error"],
    });
  }
}

// Transform Roku analytics data to GTM Measurement Protocol format
function transformToGTMFormat(analyticsData: any) {
  const { event_name, timestamp, device_info, session_info, event_data } = analyticsData;
  
  const clientId = device_info.roku_os_serial || 
                   device_info.roku_os_serial_2 || 
                   device_info.roku_os_serial_3 || 
                   `roku_${Date.now()}`;

  const gtmEventName = mapEventToGTM(event_name);
  
  const eventParams: Record<string, any> = {
    event_category: getEventCategory(event_name),
    event_label: event_data?.video_title || event_data?.channel_name || event_name,
    device_type: "roku",
    roku_model: device_info.model,
    roku_os_version: device_info.roku_os_version,
    country_code: device_info.country_code,
    language: device_info.language,
    session_id: session_info.session_id,
    current_screen: session_info.current_screen,
  };

  // Add event-specific parameters
  if (event_name.includes("video")) {
    eventParams.video_title = event_data?.video_title;
    eventParams.video_id = event_data?.video_id;
    eventParams.channel_name = event_data?.channel_name;
  }

  if (event_name.includes("channel")) {
    eventParams.channel_name = event_data?.channel_name;
    eventParams.channel_id = event_data?.channel_id;
  }

  if (event_name.includes("device")) {
    eventParams.device_type = event_data?.device_type || "roku";
    eventParams.registration_success = event_data?.success;
    if (event_data?.error_message) {
      eventParams.error_message = event_data.error_message;
    }
  }

  return {
    client_id: clientId,
    events: [{
      name: gtmEventName,
      params: eventParams,
    }],
  };
}

// Map Roku event names to GTM event names
function mapEventToGTM(rokuEventName: string): string {
  const eventMap: Record<string, string> = {
    "video_play": "video_play",
    "video_pause": "video_pause", 
    "video_complete": "video_complete",
    "video_seek": "video_seek",
    "video_error": "video_error",
    "channel_view": "page_view",
    "screen_view": "page_view",
    "page_view": "page_view",
    "user_login": "login",
    "user_logout": "logout",
    "user_registration": "sign_up",
    "user_action": "custom_event",
    "device_registration": "custom_event",
    "device_linking": "custom_event",
    "device_unlinking": "custom_event",
    "button_click": "click",
    "navigation": "page_view",
    "search": "search",
    "app_launch": "app_launch",
    "app_close": "app_close",
    "error": "exception",
    "network_error": "exception",
    "performance": "timing_complete",
  };

  return eventMap[rokuEventName] || "custom_event";
}

// Get event category for GTM
function getEventCategory(eventName: string): string {
  if (eventName.includes("video")) return "video";
  if (eventName.includes("channel")) return "content";
  if (eventName.includes("user")) return "engagement";
  if (eventName.includes("device")) return "device";
  if (eventName.includes("error")) return "error";
  if (eventName.includes("performance")) return "performance";
  if (eventName.includes("app")) return "app";
  return "general";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    logger.info("Analytics event received", {
      metadata: {
        event_name: body.event_name,
        timestamp: body.timestamp,
        device_info: body.device_info,
        session_info: body.session_info,
        event_data: body.event_data,
      },
      tags: ["analytics", "roku", "device"],
    });

    // Send to Google Tag Manager via Measurement Protocol
    if (process.env.GTM_MEASUREMENT_ID && process.env.GTM_API_SECRET) {
      await sendToGoogleTagManager(body);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Analytics event processed successfully",
        event_id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      },
      { status: 200 }
    );

  } catch (error) {
    logger.error("Analytics endpoint error", {
      metadata: {
        error: error instanceof Error ? error.message : "Unknown error",
        stackTrace: error instanceof Error ? error.stack : undefined,
        errorCode: error instanceof Error ? error.name : undefined,
      },
      tags: ["analytics", "error", "roku"],
    });

    return NextResponse.json(
      {
        success: false,
        error: "Failed to process analytics event"
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
```

### Roku Analytics Implementation

```brightscript
' source/analytics.brs
function Analytics() as Object
  this = {
    global: invalid,
    sessionStartTime: 0,
    currentScreen: "Unknown",
    
    trackEvent: Analytics_trackEvent,
    trackAppLaunch: Analytics_trackAppLaunch,
    trackScreenView: Analytics_trackScreenView,
    trackVideoPlay: Analytics_trackVideoPlay,
    trackVideoPause: Analytics_trackVideoPause,
    trackVideoComplete: Analytics_trackVideoComplete,
    trackVideoSeek: Analytics_trackVideoSeek,
    trackVideoError: Analytics_trackVideoError,
    trackChannelView: Analytics_trackChannelView,
    trackDeviceRegistration: Analytics_trackDeviceRegistration,
    trackDeviceLinking: Analytics_trackDeviceLinking,
    trackUserLogin: Analytics_trackUserLogin,
    trackUserLogout: Analytics_trackUserLogout,
    trackUserAction: Analytics_trackUserAction,
    trackError: Analytics_trackError,

    _sendAnalyticsEvent: Analytics_sendAnalyticsEvent,
    _getDeviceInfo: Analytics_getDeviceInfo,
    _getSessionInfo: Analytics_getSessionInfo,
    _generateSessionId: Analytics_generateSessionId
  }
  
  if this.global <> invalid and this.global.readRegistryString("analyticsSessionId") = ""
    this.global.writeRegistryString("analyticsSessionId", this._generateSessionId())
  end if

  return this
end function

function Analytics_sendAnalyticsEvent(eventName as String, eventData as Object) as Void
  if m.global = invalid or m.global.UrlAnalytics = invalid
    ? "[Analytics] Error: Analytics URL not configured."
    return
  end if

  event = {
    event_name: eventName,
    timestamp: CreateObject("roDateTime").AsSeconds(),
    device_info: m._getDeviceInfo(),
    session_info: m._getSessionInfo(),
    event_data: eventData
  }

  task = CreateObject("roSGNode", "AnalyticsTask")
  task.url = m.global.UrlAnalytics
  task.event = event
  task.control = "run"
  
  ? "[Analytics] Sent event: "; eventName; " with data: "; FormatJson(eventData)
end function

function Analytics_trackAppLaunch() as Void
  m._sendAnalyticsEvent("app_launch", { platform: "roku" })
end function

function Analytics_trackScreenView(screenName as String) as Void
  m.currentScreen = screenName
  m._sendAnalyticsEvent("screen_view", { screen_name: screenName })
end function

function Analytics_trackVideoPlay(videoTitle as String, videoId as String, channelName as String) as Void
  m._sendAnalyticsEvent("video_play", { video_title: videoTitle, video_id: videoId, channel_name: channelName })
end function

function Analytics_trackVideoPause(videoTitle as String, videoId as String) as Void
  m._sendAnalyticsEvent("video_pause", { video_title: videoTitle, video_id: videoId })
end function

function Analytics_trackVideoComplete(videoTitle as String, videoId as String) as Void
  m._sendAnalyticsEvent("video_complete", { video_title: videoTitle, video_id: videoId })
end function

function Analytics_trackVideoSeek(videoTitle as String, videoId as String, seekToTime as Integer) as Void
  m._sendAnalyticsEvent("video_seek", { video_title: videoTitle, video_id: videoId, seek_to_time: seekToTime })
end function

function Analytics_trackVideoError(errorType as String, videoId as String, errorMessage as String) as Void
  m._sendAnalyticsEvent("video_error", { error_type: errorType, video_id: videoId, error_message: errorMessage })
end function

function Analytics_trackChannelView(channelName as String, channelId as String) as Void
  m._sendAnalyticsEvent("channel_view", { channel_name: channelName, channel_id: channelId })
end function

function Analytics_trackDeviceRegistration(platform as String, success as Boolean, error as String) as Void
  m._sendAnalyticsEvent("device_registration", { platform: platform, success: success, error_message: error })
end function

function Analytics_trackDeviceLinking(platform as String, success as Boolean, error as String) as Void
  m._sendAnalyticsEvent("device_linking", { platform: platform, success: success, error_message: error })
end function

function Analytics_trackUserLogin(method as String) as Void
  m._sendAnalyticsEvent("user_login", { method: method })
end function

function Analytics_trackUserLogout() as Void
  m._sendAnalyticsEvent("user_logout", {})
end function

function Analytics_trackUserAction(actionType as String, itemId as String, details as Object) as Void
  eventData = { action_type: actionType, item_id: itemId }
  if details <> invalid then eventData.Append(details)
  m._sendAnalyticsEvent("user_action", eventData)
end function

function Analytics_trackError(errorType as String, errorMessage as String, errorCode as Integer) as Void
  m._sendAnalyticsEvent("app_error", { error_type: errorType, error_message: errorMessage, error_code: errorCode })
end function

function Analytics_getDeviceInfo() as Object
  dev = CreateObject("roDeviceInfo")
  return {
    device_id: dev.GetDeviceId(),
    model: dev.GetModel(),
    roku_os_version: dev.GetVersion(),
    country_code: dev.GetCountryCode(),
    language: dev.GetUIPreferredLanguage(),
    time_zone: dev.GetTimeZone(),
    is_hd: dev.Is and dev.CanDisplay("720p"),
    is_fhd: dev.Is and dev.CanDisplay("1080p"),
    is_4k: dev.Is and dev.CanDisplay("2160p"),
    connection_type: dev.GetConnectionStatus(),
    developer_id: dev.GetChannelClientId(),
    channel_version: m.global.readRegistryString("channelVersion")
  }
end function

function Analytics_getSessionInfo() as Object
  sessionId = m.global.readRegistryString("analyticsSessionId")
  if sessionId = ""
    sessionId = m._generateSessionId()
    m.global.writeRegistryString("analyticsSessionId", sessionId)
  end if
  
  return {
    session_id: sessionId,
    session_start_time: m.sessionStartTime,
    current_screen: m.currentScreen
  }
end function

function Analytics_generateSessionId() as String
  return "roku_sess_" + CreateObject("roDateTime").AsSeconds().toStr() + "_" + Rnd(100000).toStr()
end function

' AnalyticsTask - HTTP POST task for analytics events
component "AnalyticsTask"
  properties {
    url as String
    event as Object
  }

  private sub Run()
    if m.url = invalid or m.event = invalid
      ? "[AnalyticsTask] Error: URL or event data missing."
      return
    end if

    req = Requests()
    response = req.post(m.url, { json: m.event })

    if response.ok
      ? "[AnalyticsTask] Event sent successfully: "; m.event.event_name
    else
      ? "[AnalyticsTask] Failed to send event: "; m.event.event_name; " Status: "; response.statusCode; " Error: "; response.text
    end if
  end sub
end component
```

## 🎯 Event Tracking

### Available Events

#### **Authentication Events**

- `trackLogin(method)` - User login
- `trackSignUp(method)` - User registration  
- `trackLogout()` - User logout

#### **Video/Content Events**

- `trackChannelView(channelName, channelId)` - Channel page view
- `trackVideoPlay(title, videoId, channelName)` - Video playback start
- `trackVideoComplete(title, videoId, channelName)` - Video completion
- `trackVideoPause(title, videoId, position)` - Video pause
- `trackVideoSeek(title, videoId, from, to)` - Video seeking

#### **EPG Events**

- `trackEPGView(programTitle, channelName, startTime)` - Program guide view
- `trackProgramReminder(programTitle, channelName, reminderTime)` - Reminder set

#### **Device Events**

- `trackDeviceRegistration(deviceType, deviceId)` - Device registration
- `trackDeviceLinking(deviceType, success)` - Device linking

#### **Search Events**

- `trackChannelSearch(searchTerm, resultsCount)` - Channel search
- `trackProgramSearch(searchTerm, resultsCount)` - Program search

#### **User Preference Events**

- `trackLanguageChange(from, to)` - Language change
- `trackThemeChange(theme)` - Theme change

#### **Error Events**

- `trackError(errorType, errorMessage, page)` - General errors
- `trackVideoError(errorType, videoId, channelName)` - Video errors

#### **Performance Events**

- `trackPageLoadTime(page, loadTime)` - Page load performance
- `trackVideoLoadTime(videoId, loadTime)` - Video load performance

#### **Social Events**

- `trackShare(platform, content, contentType)` - Content sharing

### Usage Examples

#### **Basic Event Tracking**

```tsx
import { analytics } from "@/lib/analytics";

// Track user login
analytics.trackLogin("google");

// Track video play
analytics.trackVideoPlay("Channel News", "channel-123", "News Channel");

// Track channel view
analytics.trackChannelView("Sports Channel", "sports-456");
```

#### **Using Tracked Components**

```tsx
import { TrackedButton } from "@/components/analytics/tracked-button";
import { TrackedForm } from "@/components/analytics/tracked-form";

// Button with tracking
<TrackedButton
  trackingEvent="channel_subscribe"
  trackingParameters={{ channel_id: "sports-456" }}
  onClick={() => subscribeToChannel()}
>
  Subscribe to Channel
</TrackedButton>

// Form with tracking
<TrackedForm formName="contact_form" onSubmit={handleSubmit}>
  <input type="email" name="email" />
  <button type="submit">Submit</button>
</TrackedForm>
```

#### **Using the Analytics Hook**

```tsx
import { useAnalytics } from "@/lib/analytics";

function VideoPlayer({ videoId, title }) {
  const analytics = useAnalytics();

  const handlePlay = () => {
    analytics.trackVideoPlay(title, videoId);
  };

  const handleComplete = () => {
    analytics.trackVideoComplete(title, videoId);
  };

  return (
    <div>
      <button onClick={handlePlay}>Play</button>
      {/* Video player component */}
    </div>
  );
}
```

## 🧪 Testing & Debugging

### **Test Component**

```tsx
// src/components/analytics/gtm-test.tsx
"use client";

import { useEffect, useState } from "react";
import { sendGAEvent } from "@next/third-parties/google";

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}

export function GATest() {
  const [gaStatus, setGaStatus] = useState<{
    dataLayer: boolean;
    gtag: boolean;
  }>({
    dataLayer: false,
    gtag: false,
  });

  useEffect(() => {
    const checkGAStatus = () => {
      const dataLayer = typeof window !== "undefined" && Array.isArray(window.dataLayer);
      const gtag = typeof window !== "undefined" && typeof window.gtag === "function";

      setGaStatus({ dataLayer, gtag });
    };

    checkGAStatus();
    const timer = setTimeout(checkGAStatus, 2000);
    return () => clearTimeout(timer);
  }, []);

  const testEvent = () => {
    sendGAEvent({
      event: "ga_test",
      test_parameter: "test_value",
      timestamp: new Date().toISOString(),
    });
  };

  const testPageView = () => {
    sendGAEvent({
      event: "page_view",
      page_title: document.title,
      page_location: window.location.href,
    });
  };

  return (
    <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
      <h3 className="text-lg font-semibold mb-4">Google Analytics Status Check</h3>
      
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${gaStatus.dataLayer ? 'bg-green-500' : 'bg-red-500'}`} />
          <span>Data Layer: {gaStatus.dataLayer ? '✅' : '❌'}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${gaStatus.gtag ? 'bg-green-500' : 'bg-red-500'}`} />
          <span>GTAG Function: {gaStatus.gtag ? '✅' : '❌'}</span>
        </div>
      </div>

      <div className="space-y-2">
        <button
          onClick={testEvent}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Test Event
        </button>
        
        <button
          onClick={testPageView}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 ml-2"
        >
          Test Page View
        </button>
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p>Environment Variable: {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'Not set'}</p>
        <p>Check browser console and Google Analytics for events.</p>
      </div>
    </div>
  );
}
```

### **Debug Commands**

```javascript
// Check GA status
console.log('Data layer:', window.dataLayer);
console.log('GTAG function:', typeof window.gtag);

// Manual event test
window.gtag('event', 'manual_test', {
  test_parameter: 'test_value'
});

// Check environment variable
console.log('GA Measurement ID:', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID);
```

### **Verification Steps**

1. Add `NEXT_PUBLIC_GA_MEASUREMENT_ID` to `.env.local`
2. Start development server
3. Check browser console for GA events
4. Use Google Analytics Real-time reports
5. Test with the GATest component

## 🔒 Privacy & Compliance

### **GDPR Compliance**

- Implement consent management
- Use Google Analytics consent mode
- Respect user privacy preferences

### **Data Retention**

- Configure appropriate data retention periods in GA4
- Review and clean up old data regularly

### **Privacy Policy**

- Update privacy policy to include analytics tracking
- Provide opt-out mechanisms where required

## 🚨 Troubleshooting

### **Common Issues**

#### **1. GA not loading**

- Check environment variable is set correctly
- Verify GA Measurement ID format (G-XXXXXXXXXX)
- Check browser console for errors

#### **2. Events not firing**

- Verify `sendGAEvent` is being called
- Check GA Real-time reports
- Ensure proper event parameters

#### **3. Page views not tracking**

- Check if PageViewTracker is included in layout
- Verify GA configuration for page view events

#### **4. Server-side analytics not working**

- Check `GTM_MEASUREMENT_ID` and `GTM_API_SECRET` environment variables
- Verify API endpoint is accessible
- Check server logs for errors

### **Debug Commands**

```javascript
// Check GA status
console.log('Data layer:', window.dataLayer);
console.log('GTAG function:', typeof window.gtag);

// Manual event test
window.gtag('event', 'manual_test', {
  test_parameter: 'test_value'
});

// Check environment variables
console.log('GA Measurement ID:', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID);
```

### **Server-side Debugging**

```typescript
// Check server logs
logger.info("Analytics event received", {
  metadata: { event_name: body.event_name },
  tags: ["analytics", "debug"],
});

// Test API endpoint
curl -X POST http://localhost:3000/api/pstv/devices/analytics \
  -H "Content-Type: application/json" \
  -d '{"event_name":"test","timestamp":1234567890,"device_info":{},"session_info":{},"event_data":{}}'
```

## 📚 Migration Notes

### **From Custom GTM to Next.js Third-Parties**

The project was migrated from a custom Google Tag Manager implementation to Next.js third-parties Google Analytics for better performance, type safety, and maintainability.

#### **Key Changes**

- **Before**: Custom GTM script injection, dataLayer management
- **After**: Single `GoogleAnalytics` component, automatic script loading

#### **Benefits**

- ✅ **Simplified implementation** with official Next.js package
- ✅ **Better performance** with optimized loading
- ✅ **Type safety** with built-in TypeScript support
- ✅ **Easier maintenance** with automatic updates
- ✅ **Standard compliance** with GA4 event format

#### **Environment Variables**

```bash
# Before
NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID=GTM-XXXXXXX

# After
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

## 📈 Analytics Dashboard

### **Google Analytics 4**

- **Real-time**: View live events and users
- **Events**: Track custom events and conversions
- **Audiences**: Create user segments
- **Conversions**: Set up conversion tracking

### **Custom Reports**

- Video engagement metrics
- Device registration tracking
- User journey analysis
- Content performance

### **Cross-Platform Analytics**

- Unified view of web and TV app analytics
- Device-specific insights
- Content performance across platforms

## 🎉 Conclusion

This comprehensive Google Analytics setup provides:

- ✅ **Unified analytics** across web, Android TV, and Roku platforms
- ✅ **Real-time tracking** with Google Analytics 4
- ✅ **Server-side analytics** for TV platforms
- ✅ **Type-safe implementation** with Next.js third-parties
- ✅ **Comprehensive event tracking** for riben.life specific actions
- ✅ **Privacy compliance** with GDPR considerations
- ✅ **Easy testing and debugging** with built-in tools

The implementation ensures consistent analytics across all platforms while respecting the technical constraints of each platform, providing comprehensive insights into user behavior and content performance.
