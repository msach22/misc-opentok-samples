package com.tokbox.android.clicktocall.utils;


import android.content.Context;
import android.util.Log;
import android.widget.Toast;

import com.android.volley.Request;
import com.android.volley.RequestQueue;
import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.JsonObjectRequest;
import com.android.volley.toolbox.StringRequest;
import com.android.volley.toolbox.Volley;
import com.tokbox.android.clicktocall.config.OpenTokConfig;

import org.json.JSONException;
import org.json.JSONObject;


/**
 * Created by mserrano on 17/08/16.
 */
public class Controller {

    private static final String LOG_TAG = Controller.class.getSimpleName();

    private Context mContext;
    private RequestQueue mQueue;

    public interface ControllerListener{
        public void onWidgetIdChecked(Boolean valid);
        public void onWidgetIdCredentials(String sessionId, String token, String apiKey);
    }
    private ControllerListener mControllerListener;

    public Controller(Context context, ControllerListener listener) {
        mContext = context;
        mControllerListener = listener;
        mQueue = Volley.newRequestQueue(mContext);
    }

    public void checkWidgetId(String id){
        final String url = OpenTokConfig.BACKEND_URL + "widget/" +id;
        final boolean[] validId = {false};

        // prepare the Request
        JsonObjectRequest getRequest = new JsonObjectRequest(Request.Method.GET, url, null,
                new Response.Listener<JSONObject>()
                {
                    @Override
                    public void onResponse(JSONObject response) {
                        // display response
                        Log.d("Response", response.toString());
                        if (response.length() == 0){
                            mControllerListener.onWidgetIdChecked(false);
                        }
                        else {
                            mControllerListener.onWidgetIdChecked(true);
                        }
                    }
                },
                new Response.ErrorListener()
                {
                    @Override
                    public void onErrorResponse(VolleyError error) {
                        Log.d("Error.Response", error.toString());
                        Toast.makeText(mContext, "Internal Error checking the ID", Toast.LENGTH_LONG).show();
                        mControllerListener.onWidgetIdChecked(false);
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
                        // response
                        Log.d("CREDENTIALS Response", response);
                        try {
                            if ( response.length() != 0 ) {
                                JSONObject jObj = new JSONObject(response);
                                String sessionId = jObj.getString("sessionId");
                                String token = jObj.getString("token");
                                String apiKey = jObj.getString("apiKey");

                                mControllerListener.onWidgetIdCredentials(sessionId, token, apiKey);
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
                        // error
                        Log.d("Error.Response", error.toString());
                        Toast.makeText(mContext, "Internal Error getting credentials", Toast.LENGTH_LONG).show();
                    }
                }
        );
        mQueue.add(postRequest);
    }
}
