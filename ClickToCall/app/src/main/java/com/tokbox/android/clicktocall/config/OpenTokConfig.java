package com.tokbox.android.clicktocall.config;

/**
 * Created by mserrano on 17/08/16.
 */
public class OpenTokConfig {

    public static final String BACKEND_URL = "https://connect.tokbox.com/";

    public static final String ARG_WIDGET_ID = "widgetId";
    public static final String LAST_WIDGET_DATA = "LAST_WIDGET_DATA";


    // For internal use only. Please do not modify or remove this code.
    public static final String LOG_CLIENT_VERSION = "android-vsol-1.0.0";
    public static final String LOG_COMPONENTID = "clickToCall";
    public static final String LOG_ACTION_INITIALIZE = "Init";
    public static final String LOG_ACTION_START_COMM = "Start";
    public static final String LOG_ACTION_END_COMM = "End";

    public static final String LOG_VARIATION_ATTEMPT = "Attempt";
    public static final String LOG_VARIATION_ERROR = "Failure";
    public static final String LOG_VARIATION_SUCCESS = "Success";
}
