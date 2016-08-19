package com.tokbox.android.clicktocall.utils;

import android.content.Context;
import android.app.AlertDialog;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import android.widget.Toast;

import com.android.volley.Request;
import com.android.volley.RequestQueue;
import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.JsonObjectRequest;
import com.android.volley.toolbox.StringRequest;
import com.android.volley.toolbox.Volley;
import com.tokbox.android.clicktocall.R;
import com.tokbox.android.clicktocall.config.OpenTokConfig;

import org.json.JSONException;
import org.json.JSONObject;


public class Controller {

    private static final String LOGTAG = Controller.class.getSimpleName();

    private Context mContext;
    private RequestQueue mQueue;

    public interface ControllerListener{
        void onCheckedData(boolean valid, boolean videoCallEnabled);
        void onFetchedData(String sessionId, String token, String apiKey);
        void onControllerError(String error);
    }
    private ControllerListener mControllerListener;

    public Controller(Context context, ControllerListener listener) {
        mContext = context;
        mControllerListener = listener;
        mQueue = Volley.newRequestQueue(mContext);
    }

    public void checkWidgetId(String id){
        final String url = OpenTokConfig.BACKEND_URL + "widget/" +id;

        JsonObjectRequest getRequest = new JsonObjectRequest(Request.Method.GET, url, null,
                new Response.Listener<JSONObject>()
                {
                    @Override
                    public void onResponse(JSONObject response) {
                        Log.d(LOGTAG, response.toString());
                        if (response.length() == 0){
                            mControllerListener.onCheckedData(false, false);
                        }
                        else {

                            try {
                                if ( response.length() != 0 ) {
                                    boolean enabled = response.getBoolean("videoEnabled");
                                    if ( enabled ){
                                        mControllerListener.onCheckedData(true, true);
                                    }
                                    else {
                                        getErrorAlert(mContext.getResources().getString(R.string.alert_call_disabled), mContext.getResources().getString(R.string.alert_call_disabled_text)).show();
                                        mControllerListener.onCheckedData(true, false);
                                    }
                                }
                            } catch (JSONException e) {
                                e.printStackTrace();
                            }


                        }
                    }
                },
                new Response.ErrorListener()
                {
                    @Override
                    public void onErrorResponse(VolleyError error) {
                        Log.d(LOGTAG, "Error response: " + error.toString());
                        getErrorAlert(mContext.getResources().getString(R.string.alert_connect_error), mContext.getResources().getString(R.string.alert_connect_error_text)).show();
                        mControllerListener.onControllerError(mContext.getResources().getString(R.string.alert_connect_error_text));
                    }
                }
        );

        // add it to the RequestQueue
        mQueue.add(getRequest);
    }

    public void getCredentials(String id){
        final String url = OpenTokConfig.BACKEND_URL + "widget/" +id +"/room/create";

        StringRequest postRequest = new StringRequest(Request.Method.POST, url,
                new Response.Listener<String>()
                {
                    @Override
                    public void onResponse(String response) {
                        Log.d(LOGTAG, "CREDENTIALS Response: " +response);
                        try {
                            if ( response.length() != 0 ) {
                                JSONObject jObj = new JSONObject(response);
                                String sessionId = jObj.getString("sessionId");
                                String token = jObj.getString("token");
                                String apiKey = jObj.getString("apiKey");

                                mControllerListener.onFetchedData(sessionId, token, apiKey);
                            }
                        } catch (JSONException e) {
                            e.printStackTrace();
                        }

                    }
                },
                new Response.ErrorListener()
                {
                    @Override
                    public void onErrorResponse(VolleyError error) {
                        Log.d(LOGTAG, "Error response: " + error.toString());
                        getErrorAlert(mContext.getResources().getString(R.string.alert_connect_error), mContext.getResources().getString(R.string.alert_connect_error_text)).show();
                        mControllerListener.onControllerError(mContext.getResources().getString(R.string.alert_connect_error_text));
                    }
                }
        );
        mQueue.add(postRequest);
    }

    private AlertDialog getErrorAlert(String title, String message){
        return new AlertDialog.Builder(mContext).
                setTitle(title).
                setMessage(message).
                setPositiveButton(mContext.getResources().getString(R.string.alert_button), null).
                setCancelable(false).create();
    }
}
