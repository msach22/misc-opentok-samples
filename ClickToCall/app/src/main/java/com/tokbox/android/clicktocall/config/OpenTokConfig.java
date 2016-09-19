package com.tokbox.android.clicktocall.config;

/**
 * Created by mserrano on 17/08/16.
 */
public class OpenTokConfig {

    public static final String BACKEND_URL = "https://connect.tokbox.com/";

    public static final String ARG_WIDGET_ID = "widgetId";
    public static final String ARG_VIDEO_ENABLED= "videoEnabled";
    public static final String ARG_SHOW_WIDGET_ID_TRUE = "showWidgetId";
    public static final String LAST_WIDGET_DATA = "LAST_WIDGET_DATA";

    public static final String INSTABUG_API_KEY="95eaa914084e17cd86311f53dbcfb117";

    // For internal use only. Please do not modify or remove this code.
    public static final String LOG_CLIENT_VERSION = "android-vsol-1.0.0";
    public static final String LOG_COMPONENTID = "clickToCall";
    public static final String LOG_ACTION_INITIALIZE = "Init"; //load login screen
    public static final String LOG_ACTION_CONNECT = "ConnectWithAgent"; //check widget ID
    public static final String LOG_ACTION_LOAD_CALL = "LoadCall"; //load call screen
    public static final String LOG_ACTION_START_COMM = "StartCall"; //start video call
    public static final String LOG_ACTION_END_COMM = "EndCall"; //end video call
    public static final String LOG_ACTION_HELP_FEEDBACK = "HelpAndFeedback"; //send bug or feedback report
    public static final String LOG_ACTION_CHANGE_ID = "ChangeID"; //go to login screen to change ID

    public static final String LOG_VARIATION_ATTEMPT = "Attempt";
    public static final String LOG_VARIATION_ERROR = "Failure";
    public static final String LOG_VARIATION_SUCCESS = "Success";
}
